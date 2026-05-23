export async function onRequestGet(context) {
    // If we reach here, middleware already validated the session
    return Response.json({ authenticated: true });
}
