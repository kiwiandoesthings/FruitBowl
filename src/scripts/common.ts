const isDevelopment = import.meta.env.DEV;
export const apiString = isDevelopment ? "http://api.test.kiwiandoesthings.place:5201/fruitbowl/" : "https://api.kiwiandoesthings.place/fruitbowl/";

const serverErrorMessage = "Server is down currently. Please try again later.";
const netErrorMessage = "Encountered a network error. Please try again.";
export default async function api(route: string, body: any, method: string, request?: Request | null, customHeaders?: HeadersInit): Promise<ApiResponse<any>> {
    try {
        const isFormData = body instanceof FormData;
        const cookieHeader = request ? request.headers.get("cookie") || "" : "";

        var fetchOptions: RequestInit = {
            method: method.toUpperCase(),
            credentials: "include" as RequestCredentials,
            headers: {
                ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
                ...customHeaders
            }
        };

        let url = apiString + route;

        if (method.toUpperCase() === "GET") {
            if (body && Object.keys(body).length > 0) {
                const cleanEntries = Object.entries(body).filter(([discard, value]) => value !== null && value !== undefined && value !== "").map(([key, value]) => [key, String(value)] as [string, string]);
        
        		if (cleanEntries.length > 0) {
            		var params = new URLSearchParams(cleanEntries);
            		url += "?" + params.toString();
        		}
            }
        } else if (isFormData) {
            fetchOptions.body = body;
        } else {
            fetchOptions.body = JSON.stringify(body);
            fetchOptions.headers = {
                "Content-Type": "application/json",
                ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
                ...customHeaders
            };
        }

        var response = await fetch(url, fetchOptions);

        if (response.status == 500) {
            return new ApiResponse<string>(true, 500, serverErrorMessage);
        } else if (!response.ok) {
            var unknownErrorMessage = await response.text();
            console.log(unknownErrorMessage);
            return new ApiResponse<string>(true, response.status, "Error " + response.status + ": " + unknownErrorMessage);
        }

        var data = null;
        var contentType = response.headers.get("content-type");
        var text = await response.text();

        if (text && contentType && contentType.includes("application/json")) {
            data = JSON.parse(text);
        } else if (text) {
            data = text;
        }

        return new ApiResponse<any>(!response.ok, response.status, data);
    } catch (error) {
        console.log(netErrorMessage);
        console.error(error); 
        return new ApiResponse<string>(true, 0, netErrorMessage);
    }
}

export async function apiGetBinary(route: string, body: any, request?: Request | null): Promise<ApiResponse<ArrayBuffer>> {
    try {
        const cookieHeader = request ? request.headers.get("cookie") || "" : "";
         var fetchOptions: RequestInit = {
            method: "GET",
            credentials: "include" as RequestCredentials,
            headers: {
                ...(cookieHeader ? { "Cookie": cookieHeader } : {})
            }
        };

        let url = apiString + route;

        var response = await fetch(url, fetchOptions);

        if (response.status == 500) {
            return new ApiResponse<ArrayBuffer>(true, 500, new ArrayBuffer(0));
        } else if (!response.ok) {
            var unknownErrorMessage = await response.text();
            console.log(unknownErrorMessage);
            return new ApiResponse<ArrayBuffer>(true, response.status, new ArrayBuffer(0));
        }

        return new ApiResponse<ArrayBuffer>(!response.ok, response.status, await response.arrayBuffer());
    } catch (error) {
        console.log(netErrorMessage);
        console.log(error);
        return new ApiResponse<ArrayBuffer>(true, 0, new ArrayBuffer(0));
    }
}

class ApiResponse<T> {
	error: boolean;
	status: number;
	data: T;

	constructor(error: boolean, status: number, data: T) {
		this.error = error;
		this.status = status;
		this.data = data;
	}
}

export function isNullOrWhitespace(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
};