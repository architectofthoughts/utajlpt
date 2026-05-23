// 클라이언트가 GIS를 초기화하려면 client_id가 필요해서, 서버에서 'public'
// 정보만 노출하는 엔드포인트. client_id 자체는 비밀이 아님 (브라우저 노출 의도).

export async function onRequestGet(context) {
    const clientId = context.env.OAUTH_CLIENT_ID;
    return Response.json({
        enabled: !!clientId,
        clientId: clientId || null
    });
}
