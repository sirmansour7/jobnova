/**
 * Tests for app/hr/interviews/[id]/page.tsx
 * Mocks: apiJson, useParams, useRouter, ProtectedRoute, DashboardLayout
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HrInterviewDetailPage from '@/app/hr/interviews/[id]/page';

const mockApiJson = jest.fn();

jest.mock('@/src/lib/api', () => ({
  apiJson: (...args: unknown[]) => mockApiJson(...args),
}));

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'session-1' }),
  useRouter: () => ({}),
}));

jest.mock('@/components/shared/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/shared/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

const mockSession = {
  id: 'session-1',
  status: 'completed',
  startedAt: new Date().toISOString(),
  hrDecision: null as string | null,
  job: { id: 'j1', title: 'مهندس برمجيات', organization: { name: 'شركة أ' } },
  candidate: { id: 'c1', fullName: 'أحمد محمد', email: 'ahmed@test.com' },
  messages: [
    { id: 'm1', role: 'bot', content: 'عرفنا بنفسك', createdAt: '' },
    { id: 'm2', role: 'candidate', content: 'أنا أحمد', createdAt: '' },
  ],
  summary: {
    summaryTextArabic: 'ملخص التجربة',
    recommendation: 'مقبول',
    yearsExperience: '5',
    availability: 'فوري',
    salaryExpectation: '20k',
  },
};

describe('HR Interview Detail Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiJson.mockImplementation((url: string, options?: { method?: string; body?: string }) => {
      if (url === '/v1/hr/interviews/session-1' && options?.method !== 'PATCH') {
        return Promise.resolve(mockSession);
      }
      if (url === '/v1/hr/interviews/session-1/decision' && options?.method === 'PATCH') {
        return Promise.resolve({ ...mockSession, hrDecision: 'shortlist', status: 'reviewed' });
      }
      return Promise.reject(new Error('Unexpected'));
    });
  });

  it('shows loading then candidate and job info', async () => {
    render(<HrInterviewDetailPage />);
    await waitFor(() => {
      expect(screen.getByText(/أحمد محمد/)).toBeInTheDocument();
    });
    expect(screen.getByText(/مهندس برمجيات/)).toBeInTheDocument();
    expect(screen.getByText(/شركة أ/)).toBeInTheDocument();
  });

  it('renders transcript messages', async () => {
    render(<HrInterviewDetailPage />);
    await waitFor(() => {
      expect(screen.getByText(/عرفنا بنفسك/)).toBeInTheDocument();
    });
    expect(screen.getByText(/أنا أحمد/)).toBeInTheDocument();
  });

  it('renders summary section', async () => {
    render(<HrInterviewDetailPage />);
    await waitFor(() => {
      expect(screen.getByText(/ملخص التجربة/)).toBeInTheDocument();
    });
    expect(screen.getByText(/التوصية:/)).toBeInTheDocument();
    expect(screen.getAllByText(/مقبول/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders decision buttons', async () => {
    render(<HrInterviewDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /مقبول مبدئياً/ })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /رفض/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /يحتاج مراجعة/ })).toBeInTheDocument();
  });

  it('PATCH decision on button click', async () => {
    const user = userEvent.setup();
    render(<HrInterviewDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /مقبول مبدئياً/ })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /مقبول مبدئياً/ }));
    await waitFor(() => {
      expect(mockApiJson).toHaveBeenCalledWith(
        '/v1/hr/interviews/session-1/decision',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ decision: 'shortlist' }) }),
      );
    });
  });

  it('shows decision error state when PATCH fails', async () => {
    mockApiJson.mockImplementation((url: string, options?: { method?: string }) => {
      if (url === '/v1/hr/interviews/session-1' && options?.method !== 'PATCH') {
        return Promise.resolve(mockSession);
      }
      if (url === '/v1/hr/interviews/session-1/decision') {
        return Promise.reject(new Error('Server error'));
      }
      return Promise.reject(new Error('Unexpected'));
    });
    const user = userEvent.setup();
    render(<HrInterviewDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /مقبول مبدئياً/ })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /مقبول مبدئياً/ }));
    await waitFor(() => {
      expect(screen.getByText(/Server error|حدث خطأ/)).toBeInTheDocument();
    });
  });
});
