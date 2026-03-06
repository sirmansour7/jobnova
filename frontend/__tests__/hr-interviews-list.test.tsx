/**
 * Tests for app/hr/interviews/page.tsx
 * Mocks: apiJson, ProtectedRoute, DashboardLayout
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HrInterviewsPage from '@/app/hr/interviews/page';

const mockApiJson = jest.fn();

jest.mock('@/src/lib/api', () => ({
  apiJson: (...args: unknown[]) => mockApiJson(...args),
}));

jest.mock('@/components/shared/protected-route', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/shared/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

describe('HR Interviews List Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    mockApiJson.mockReturnValue(new Promise(() => {}));
    render(<HrInterviewsPage />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders sessions list after load', async () => {
    mockApiJson.mockResolvedValue({
      items: [
        {
          id: 's1',
          status: 'completed',
          startedAt: new Date().toISOString(),
          job: { id: 'j1', title: 'مهندس برمجيات', organization: { name: 'شركة أ' } },
          candidate: { id: 'c1', fullName: 'أحمد محمد', email: 'ahmed@test.com' },
          summary: { recommendation: 'مقبول' },
        },
      ],
    });
    render(<HrInterviewsPage />);
    await waitFor(() => {
      expect(screen.getByText(/أحمد محمد/)).toBeInTheDocument();
    });
    expect(screen.getByText(/مهندس برمجيات/)).toBeInTheDocument();
    expect(screen.getByText(/مقابلات التوظيف/)).toBeInTheDocument();
  });

  it('shows empty state when no sessions', async () => {
    mockApiJson.mockResolvedValue({ items: [] });
    render(<HrInterviewsPage />);
    await waitFor(() => {
      expect(screen.getByText(/لا توجد مقابلات حتى الآن/)).toBeInTheDocument();
    });
  });

  it('shows API error state', async () => {
    mockApiJson.mockRejectedValue(new Error('Network error'));
    render(<HrInterviewsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Network error|حدث خطأ/)).toBeInTheDocument();
    });
  });
});
