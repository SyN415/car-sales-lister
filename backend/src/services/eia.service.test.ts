import axios from 'axios';
import config from '../config/config';
import { eiaService } from './eia.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EiaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (eiaService as any).cache = null;
    config.EIA_API_KEY = 'test-eia-key';
  });

  it('falls back to the dashboard-style series query when the primary query fails', async () => {
    mockedAxios.get
      .mockRejectedValueOnce({
        message: 'Request failed with status code 400',
        response: { status: 400, data: { error: 'bad request' } },
      })
      .mockResolvedValueOnce({
        data: {
          response: {
            data: [
              {
                value: '4.55',
                period: '2026-02',
                'area-name': 'California',
                'product-name': 'Regular Gasoline',
              },
            ],
          },
        },
      } as any);

    const result = await eiaService.getCaliforniaGasPrice();

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedAxios.get.mock.calls[1]?.[1]).toMatchObject({
      params: expect.objectContaining({
        frequency: 'monthly',
        'facets[series][]': 'EMD_EPD2D_PTE_R1Y_DPG',
      }),
    });
    expect(result).toEqual({
      price_per_gallon: 4.55,
      area: 'California',
      product: 'Regular Gasoline',
      period: '2026-02',
      source: 'eia',
    });
  });

  it('caches the fallback result after all queries fail', async () => {
    mockedAxios.get.mockRejectedValue({
      message: 'Request failed with status code 400',
      response: { status: 400, data: { error: 'bad request' } },
    });

    const first = await eiaService.getCaliforniaGasPrice();
    const second = await eiaService.getCaliforniaGasPrice();

    expect(first).toEqual({
      price_per_gallon: 4.99,
      area: 'California (fallback)',
      product: 'Regular Gasoline',
      period: 'unknown',
      source: 'default',
    });
    expect(second).toEqual(first);
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });
});