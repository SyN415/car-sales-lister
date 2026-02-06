import axios from 'axios';
import config from '../config/config';
import { VinDecodeResult } from '../types/valuation.types';

class VinDecoderService {
  private readonly NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api';

  /**
   * Decode a VIN using NHTSA vPIC API (free, no key required)
   */
  async decodeVin(vin: string): Promise<VinDecodeResult> {
    try {
      const response = await axios.get(
        `${this.NHTSA_BASE_URL}/vehicles/DecodeVinValues/${vin}?format=json`
      );

      const result = response.data?.Results?.[0];
      if (!result) {
        throw new Error('No results returned from VIN decoder');
      }

      return {
        vin,
        make: result.Make || '',
        model: result.Model || '',
        year: parseInt(result.ModelYear) || 0,
        trim: result.Trim || undefined,
        engine: result.EngineModel || result.DisplacementL ? `${result.DisplacementL}L ${result.EngineModel || ''}`.trim() : undefined,
        transmission: result.TransmissionStyle || undefined,
        drive_type: result.DriveType || undefined,
        fuel_type: result.FuelTypePrimary || undefined,
        body_type: result.BodyClass || undefined,
        doors: result.Doors ? parseInt(result.Doors) : undefined,
        cylinders: result.EngineCylinders ? parseInt(result.EngineCylinders) : undefined,
        displacement: result.DisplacementL || undefined,
        plant_country: result.PlantCountry || undefined,
      };
    } catch (error: any) {
      console.error('VIN decode error:', error.message);
      throw new Error(`Failed to decode VIN: ${error.message}`);
    }
  }

  /**
   * Validate VIN checksum (basic validation)
   */
  isValidVin(vin: string): boolean {
    if (!vin || vin.length !== 17) return false;
    const validChars = /^[A-HJ-NPR-Z0-9]{17}$/i;
    return validChars.test(vin);
  }
}

export const vinDecoderService = new VinDecoderService();
