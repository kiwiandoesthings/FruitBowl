const isDevelopment = import.meta.env.DEV;
const apiString = isDevelopment ? "https://api.test.kiwiandoesthings.place/forums/" : "https://api.kiwiandoesthings.place/forums/";

const serverErrorMessage = "Server is down currently. Please try again later.";
const netErrorMessage = "Encountered a network error. Please try again.";
export async function api(route: string, body: any, method: string): Promise<ApiResponse<any>> {
    try {
        var fetchOptions: RequestInit = {
            method: method.toUpperCase(),
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include" as RequestCredentials
        };

        let url = apiString + route;

        if (method.toUpperCase() === "GET") {
            if (body && Object.keys(body).length > 0) {
                var params = new URLSearchParams(body);
                url += "?" + params.toString();
            }
        } else {
            fetchOptions.body = JSON.stringify(body);
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

export async function apiGetBinary(route: string, body: any): Promise<ApiResponse<ArrayBuffer>> {
	try {
		let fetchOptions: RequestInit = {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include" as RequestCredentials
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