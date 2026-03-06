/**
 * Tests for app/candidate/interview/[applicationId]/page.tsx
 * Mocks: apiJson, useParams, useRouter, ProtectedRoute
 * Uses deferred promise resolution so state updates run inside act() and avoid warnings.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InterviewPage from '@/app/candidate/interview/[applicationId]/page';

const mockApiJson = jest.fn();
const mockPush = jest.fn();
const mockRouter = { push: mockPush };

jest.mock('@/src/lib/api', () => ({
  apiJson: (...args: unknown[]) => mockApiJson(...args),
}));

const mockParams = { applicationId: 'app-123' };
jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => mockRouter,
}));

jest.mock('@/components/shared/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const defaultAppData = {
  id: 'app-123',
  status: 'APPLIED',
  job: { title: 'Test Job', organization: { name: 'Test Org' } },
};

const defaultSessionData = {
  id: 'session-1',
  status: 'active',
  messages: [{ id: 'm1', role: 'bot', content: 'عرفنا بنفسك باختصار', createdAt: new Date().toISOString() }],
  currentStep: 0,
};

/** Resolvers assigned by the mock when apiJson is called; used so flush runs after start request exists. */
const deferred = {
  resolveApp: undefined as (v: unknown) => void,
  resolveStart: undefined as (v: unknown) => void,
};

/** Flush initial load (app + start) so state updates happen inside act(). */
async function flushInitialLoad(
  appData = defaultAppData,
  sessionData = defaultSessionData,
) {
  await act(async () => {
    deferred.resolveApp(appData);
    await new Promise((r) => setTimeout(r, 0)); // yield so loadApplication .then runs and startInterview() is called
    deferred.resolveStart(sessionData);
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();
  });
}

describe('Candidate Interview Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    deferred.resolveApp = undefined as unknown as (v: unknown) => void;
    deferred.resolveStart = undefined as unknown as (v: unknown) => void;
    mockApiJson.mockImplementation((url: string, options?: { method?: string; body?: string }) => {
      if (url === '/v1/applications/app-123') {
        return new Promise((r) => {
          deferred.resolveApp = r;
        });
      }
      if (url === '/v1/interviews/start' && options?.method === 'POST') {
        return new Promise((r) => {
          deferred.resolveStart = r;
        });
      }
      if (url.startsWith('/v1/interviews/') && url.endsWith('/answer') && options?.method === 'POST') {
        const body = options?.body ? JSON.parse(options.body) : {};
        return Promise.resolve({
          id: 'session-1',
          status: 'active',
          messages: [
            { id: 'm1', role: 'bot', content: 'عرفنا بنفسك باختصار', createdAt: new Date().toISOString() },
            { id: 'm2', role: 'candidate', content: body.content ?? '', createdAt: new Date().toISOString() },
            { id: 'm3', role: 'bot', content: 'ايه خبرتك في المجال؟', createdAt: new Date().toISOString() },
          ],
          currentStep: 1,
        });
      }
      return Promise.reject(new Error('Unexpected request'));
    });
  });

  it('shows loading state initially', () => {
    render(<InterviewPage />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows first bot question after start', async () => {
    render(<InterviewPage />);
    await flushInitialLoad();
    expect(screen.getByText(/عرفنا بنفسك باختصار/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /المقابلة السريعة/ })).toBeInTheDocument();
  });

  it('renders messages correctly (bot vs candidate)', async () => {
    render(<InterviewPage />);
    await flushInitialLoad();
    const botMessage = screen.getByText(/عرفنا بنفسك باختصار/);
    expect(botMessage).toBeInTheDocument();
  });

  it('send answer updates messages', async () => {
    let resolveAnswer: (v: unknown) => void;
    mockApiJson.mockImplementation((url: string, options?: { method?: string; body?: string }) => {
      if (url === '/v1/applications/app-123') {
        return new Promise((r) => {
          deferred.resolveApp = r;
        });
      }
      if (url === '/v1/interviews/start' && options?.method === 'POST') {
        return new Promise((r) => {
          deferred.resolveStart = r;
        });
      }
      if (url.startsWith('/v1/interviews/') && url.endsWith('/answer') && options?.method === 'POST') {
        const body = options?.body ? JSON.parse(options.body) : {};
        return new Promise<unknown>((r) => {
          resolveAnswer = r;
        }).then(() => ({
          id: 'session-1',
          status: 'active',
          messages: [
            { id: 'm1', role: 'bot', content: 'عرفنا بنفسك باختصار', createdAt: new Date().toISOString() },
            { id: 'm2', role: 'candidate', content: (body as { content?: string }).content ?? '', createdAt: new Date().toISOString() },
            { id: 'm3', role: 'bot', content: 'ايه خبرتك في المجال؟', createdAt: new Date().toISOString() },
          ],
          currentStep: 1,
        }));
      }
      return Promise.reject(new Error('Unexpected request'));
    });

    const user = userEvent.setup();
    render(<InterviewPage />);
    await flushInitialLoad();
    const input = screen.getByPlaceholderText(/اكتب إجابتك/);
    fireEvent.change(input, { target: { value: 'إجابة تجريبية' } });
    const submitBtn = screen.getByRole('button', { name: /^إرسال$/ });
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText(/جاري الإرسال/)).toBeInTheDocument();
    });
    await act(async () => {
      resolveAnswer!({});
      await Promise.resolve();
    });
    await waitFor(
      () => {
        const answerCalls = mockApiJson.mock.calls.filter(
          (c) => c[0]?.includes('/answer') && typeof c[1]?.method === 'string' && c[1].method === 'POST',
        );
        expect(answerCalls.length).toBeGreaterThanOrEqual(1);
        expect(answerCalls[0][0]).toContain('session-1');
        expect(JSON.parse((answerCalls[0][1] as { body: string }).body)).toEqual({ content: 'إجابة تجريبية' });
      },
      { timeout: 3000 },
    );
  });

  it('submit is disabled when input empty', async () => {
    render(<InterviewPage />);
    await flushInitialLoad();
    const submitBtn = screen.getByRole('button', { name: /إرسال/ });
    expect(submitBtn).toBeDisabled();
  });

  it('submit is disabled while request pending', async () => {
    let resolveAnswer: (v: unknown) => void;
    mockApiJson.mockImplementation((url: string) => {
      if (url === '/v1/applications/app-123') {
        return new Promise((r) => {
          deferred.resolveApp = r;
        });
      }
      if (url === '/v1/interviews/start') {
        return new Promise((r) => {
          deferred.resolveStart = r;
        });
      }
      if (url.includes('/answer')) {
        return new Promise((r) => {
          resolveAnswer = r;
        });
      }
      return Promise.reject(new Error('Unexpected'));
    });

    const user = userEvent.setup();
    render(<InterviewPage />);
    await flushInitialLoad(
      { id: 'app-123', status: 'APPLIED', job: { title: 'J', organization: { name: 'O' } } },
      { id: 'session-1', status: 'active', messages: [{ id: 'm1', role: 'bot', content: 'سؤال', createdAt: new Date().toISOString() }] },
    );
    await user.type(screen.getByPlaceholderText(/اكتب إجابتك/), 'نص');
    const sendBtn = screen.getByRole('button', { name: /إرسال/ });
    await user.click(sendBtn);
    await waitFor(() => {
      expect(screen.getByText(/جاري الإرسال/)).toBeInTheDocument();
    });
    const pendingBtn = screen.getByRole('button', { name: /جاري الإرسال/ });
    expect(pendingBtn).toBeDisabled();
    await act(async () => {
      resolveAnswer!({
        id: 'session-1',
        status: 'active',
        messages: [
          { id: 'm1', role: 'bot', content: 'سؤال', createdAt: '' },
          { id: 'm2', role: 'candidate', content: 'نص', createdAt: '' },
        ],
      });
      await Promise.resolve();
    });
  });

  it('shows completion state when status is completed', async () => {
    mockApiJson.mockImplementation((url: string) => {
      if (url === '/v1/applications/app-123') {
        return new Promise((r) => {
          deferred.resolveApp = r;
        });
      }
      if (url === '/v1/interviews/start') {
        return new Promise((r) => {
          deferred.resolveStart = r;
        });
      }
      return Promise.reject(new Error('Unexpected'));
    });
    render(<InterviewPage />);
    await flushInitialLoad(
      { id: 'app-123', status: 'APPLIED', job: { title: 'J', organization: { name: 'O' } } },
      { id: 'session-1', status: 'completed', messages: [{ id: 'm1', role: 'bot', content: 'سؤال', createdAt: '' }], summary: { recommendation: 'مقبول' } },
    );
    expect(screen.getByText(/تم إرسال إجاباتك بنجاح/)).toBeInTheDocument();
    expect(screen.getByText(/تم تجهيز ملخص مبدئي/)).toBeInTheDocument();
  });

  it('shows API error state when start fails', async () => {
    let rejStart: (err: Error) => void;
    const startPromise = new Promise<never>((_, rej) => {
      rejStart = rej;
    });
    mockApiJson.mockImplementation((url: string) => {
      if (url === '/v1/applications/app-123') {
        return new Promise((r) => {
          deferred.resolveApp = r;
        });
      }
      if (url === '/v1/interviews/start') {
        return startPromise;
      }
      return Promise.reject(new Error('Unexpected'));
    });
    render(<InterviewPage />);
    await act(async () => {
      deferred.resolveApp!({ id: 'app-123', status: 'APPLIED', job: { title: 'J' } });
      rejStart!(new Error('Forbidden'));
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText(/Forbidden|حدث خطأ/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /عرض طلباتي/ })).toBeInTheDocument();
  });
});
