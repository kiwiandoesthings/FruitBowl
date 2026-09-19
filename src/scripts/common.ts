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
            let cleanEntries: [string, string][] = [];

            if (body instanceof FormData) {
                for (const [key, value] of body.entries()) {
                    if (value !== null && value !== undefined && value !== "") {
                        cleanEntries.push([key, String(value)]);
                    }
                }
            } else if (body && Object.keys(body).length > 0) {
                cleanEntries = Object.entries(body).filter(([_, value]) => value !== null && value !== undefined && value !== "").map(([key, value]) => [key, String(value)]);
            }

            if (cleanEntries.length > 0) {
                let params = new URLSearchParams(cleanEntries);
                url += "?" + params.toString();
            }
        } else if (body !== null && body !== undefined) {
            if (isFormData) {
                fetchOptions.body = body;
            } else {
                (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/json";
                fetchOptions.body = JSON.stringify(body);
            }
        }

        const response = await fetch(url, fetchOptions);

        if (response.status == 500) {
            return new ApiResponse<string>(true, 500, serverErrorMessage);
        } else if (!response.ok) {
            const unknownErrorMessage = await response.text();
            console.log(unknownErrorMessage);
            return new ApiResponse<string>(true, response.status, "Error " + response.status + ": " + unknownErrorMessage);
        }

        let data = null;
        const contentType = response.headers.get("content-type");
        const text = await response.text();

        if (text && contentType && contentType.includes("application/json")) {
            data = JSON.parse(text);
        } else if (text) {
            data = text;
        }

		const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        return new ApiResponse<any>(!response.ok, response.status, data, responseHeaders);
    } catch (error) {
        console.log(netErrorMessage);
        console.error(error); 
        return new ApiResponse<string>(true, -1, netErrorMessage);
    }
}

class ApiResponse<T> {
	error: boolean;
	status: number;
	data: T;
	headers: Record<string, string> | undefined;

	constructor(error: boolean, status: number, data: T, headers: Record<string, string> | undefined = undefined) {
		this.error = error;
		this.status = status;
		this.data = data;
		this.headers = headers;
	}
}

export function isNullOrWhitespace(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0;
};