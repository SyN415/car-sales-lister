import axios from 'axios';
import config from '../config/config';
import supabaseAdmin from '../config/supabase';
import { kbbService } from './kbb.service';

jest.mock('axios');
jest.mock('../config/supabase', () => ({
  __esModule: true,
  default: { from: jest.fn() },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSupabase = supabaseAdmin as unknown as { from: jest.Mock };

function createSelectQuery(data: any) {
  const query: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data }),
  };
  return query;
}

function createInsertQuery() {
  return { insert: jest.fn().mockResolvedValue({ data: null, error: null }) };
}

describe('KbbService', () => {
  const request = {
    make: 'Toyota',
    model: 'Camry',
    year: 2018,
    mileage: 60000,
    condition: 'good',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    config.KBB_API_KEY = '';
    config.KBB_API_URL = '';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes cached valuations without a source to estimated', async () => {
    const selectQuery = createSelectQuery({
      id: 'cached-valuation',
      make: 'Toyota',
      model: 'Camry',
      year: 2018,
      mileage: 60000,
      condition: 'good',
      estimated_value: 15800,
      low_value: 14500,
      high_value: 17000,
      fetched_at: '2026-03-01T00:00:00.000Z',
      expires_at: '2099-03-08T00:00:00.000Z',
    });
    mockedSupabase.from.mockReturnValue(selectQuery);

    const result = await kbbService.getValuation(request);

    expect(result.source).toBe('estimated');
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('marks successful API valuations as kbb_api and caches that source', async () => {
    config.KBB_API_KEY = 'live-kbb-key';
    config.KBB_API_URL = 'https://kbb.example.test';

    const selectQuery = createSelectQuery(null);
    const insertQuery = createInsertQuery();
    mockedSupabase.from
      .mockReturnValueOnce(selectQuery)
      .mockReturnValueOnce(insertQuery as any);

    mockedAxios.get.mockResolvedValueOnce({
      data: { value: 22000, rangeLow: 20500, rangeHigh: 23500 },
    } as any);

    const result = await kbbService.getValuation(request);

    expect(result.source).toBe('kbb_api');
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      source: 'kbb_api',
      estimated_value: 22000,
    }));
  });

  it('falls back to an estimated valuation source when the API fails', async () => {
    config.KBB_API_KEY = 'live-kbb-key';
    config.KBB_API_URL = 'https://kbb.example.test';

    const selectQuery = createSelectQuery(null);
    const insertQuery = createInsertQuery();
    mockedSupabase.from
      .mockReturnValueOnce(selectQuery)
      .mockReturnValueOnce(insertQuery as any);

    mockedAxios.get.mockRejectedValueOnce(new Error('KBB unavailable'));

    const result = await kbbService.getValuation(request);

    expect(result.source).toBe('estimated');
    expect(result.estimated_value).toBeGreaterThan(0);
    expect(insertQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      source: 'estimated',
    }));
  });
});