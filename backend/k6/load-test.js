import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = 'https://jobnova-production-e410.up.railway.app';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up to 10 users
    { duration: '1m',  target: 50 },  // stay at 50 users
    { duration: '30s', target: 0  },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.1'],
  },
};

export default function () {
  // 1. Health check
  const healthRes = http.get(`${BASE_URL}/v1/health/live`);
  const healthOk = check(healthRes, {
    'health: status 200 or 429': (r) => r.status === 200 || r.status === 429,
    'health: response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!healthOk);

  sleep(0.5);

  // 2. Login with invalid credentials (no side effects)
  const loginRes = http.post(
    `${BASE_URL}/v1/auth/login`,
    JSON.stringify({ email: 'loadtest@example.com', password: 'invalid_password' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  const loginOk = check(loginRes, {
    'login: status 401 or 429': (r) => r.status === 401 || r.status === 429,
    'login: response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!loginOk);

  sleep(0.5);

  // 3. Jobs listing
  const jobsRes = http.get(`${BASE_URL}/v1/jobs`);
  const jobsOk = check(jobsRes, {
    'jobs: status 200 or 429': (r) => r.status === 200 || r.status === 429,
    'jobs: response time < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!jobsOk);

  sleep(1);
}
