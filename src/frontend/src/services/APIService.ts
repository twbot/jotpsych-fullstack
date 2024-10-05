class APIService {
  private static instance: APIService;
  private baseUrl: string;
  private appVersion: string;

  private constructor() {
    this.baseUrl = "http://localhost:3002";
    this.appVersion = "1.1.0"; // Start with an old version
  }

  public static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  public getAppVersion(): string {
    return this.appVersion;
  }

  public updateAppVersion(newVersion: string): void {
    this.appVersion = newVersion;
  }

  public async request(
    endpoint: string,
    method: string,
    body?: any,
    auth: boolean = false,
    isFormData: boolean = false
  ): Promise<any> {
    const headers: HeadersInit = {
      "app-version": this.appVersion,
    };

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    if (auth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: isFormData ? body : (body ? JSON.stringify(body) : null),
      });

      if (response.status === 426) {
        throw new Error("Update required");
      }

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      return response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }
}

export default APIService.getInstance();