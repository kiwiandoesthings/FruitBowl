import { defineMiddleware } from "astro:middleware";

const isDevelopment = import.meta.env.DEV;
export const apiString = isDevelopment ? "https://api.test.kiwiandoesthings.place:7164/" : "https://api.kiwiandoesthings.place/";

if (import.meta.env.DEV) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const onRequest = defineMiddleware(async (context, next) => {
    const cookieHeader = context.request.headers.get("cookie");

    const result = await fetch(apiString + "fruitbowl/auth/", {
        headers: {
            ...(cookieHeader ? { "Cookie": cookieHeader } : {})
        }
    });

    if (result.ok) {
		const json = await result.json();
        context.locals.user = {
			id: json.id,
			username: json.username
		};
    } else {
        context.locals.user = undefined;
    }

    const response = await next();

    const setCookies = result.headers.getSetCookie();
    for (const cookie of setCookies) {
        response.headers.append("Set-Cookie", cookie);
    }

    return response;
});