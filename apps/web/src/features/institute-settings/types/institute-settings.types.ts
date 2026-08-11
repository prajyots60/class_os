export interface InstituteSettingsDTO {
  id: string;
  name: string;
  slug: string;
  phone: string;
  email: string;
  timezone: string;
  logoUrl: string | null;
  primaryColor: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSettingsSuccessResponse {
  success: true;
  data: InstituteSettingsDTO;
}

export interface ApiSettingsErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[] | string>;
  };
}

export type ApiSettingsResponse = ApiSettingsSuccessResponse | ApiSettingsErrorResponse;
