export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (url.pathname === '/user/agreement' && request.method === 'POST') {
            if (env.KV) {
                try {
                    const reqData = await request.clone().json();
                    if (reqData && Array.isArray(reqData.Type) && reqData.Type.length > 0) {
                        const agreementType = reqData.Type[0];
                        let kvKey = null;
                        if (agreementType === 'user_agreement') {
                            kvKey = 'agreement.json';
                        } else
                            if (agreementType === 'privacy_agreement') {
                                kvKey = 'agreement2.json';
                            }
                        if (kvKey) {
                            const kvText = await env.KV.get(kvKey);
                            if (kvText) {
                                return new Response(
                                    kvText,
                                    {
                                        status: 200,
                                        headers: {
                                            'Content-Type': 'application/json; charset=utf-8',
                                            'Access-Control-Allow-Origin': '*'
                                        }
                                    }
                                );
                            }
                        }
                    }
                } catch (e) {
                    console.error('解析 /user/agreement 请求体失败:', e);
                }
            }
        }
        if (url.pathname === '/common/client-info' || url.pathname === '/common/client-code') {
            try {
                const reqData = await request.clone().json();
                if (reqData.All === 1 && reqData.Code === 0) {
                    const fullData = await env.KV.get('client-info.json');
                    if (fullData) {
                        const origin = request.headers.get('Origin') || '*';
                        const headers = new Headers(
                            {
                                'Content-Type': 'application/json; charset=utf-8',
                                'Access-Control-Allow-Origin': origin,
                                'Access-Control-Allow-Credentials': 'true'
                            }
                        );
                        headers.append('Vary', 'Origin');
                        headers.set(
                            'Set-Cookie',
                            'session_id=12345678; Path=/; Domain=jp-sdk-api.bluearchive.help; Max-Age=2147483647; SameSite=None; Secure'
                        );
                        return new Response(fullData, {
                            status: 200,
                            headers
                        });
                    }
                }
            } catch (e) {}
        }
        const targetUrl = 'https://jp-sdk-api.yostarplat.com';
        const target = new URL(url.pathname + url.search, targetUrl);
        const headers = new Headers(request.headers);
        headers.delete('Host');
        headers.delete('Content-Length');
        headers.delete('Transfer-Encoding');
        const init = {
            method: request.method,
            headers,
            redirect: 'follow'
        };
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            init.body = request.body;
        }
        try {
            const modifiedRequest = new Request(target.toString(), init);
            const response = await fetch(modifiedRequest);
            const newHeaders = new Headers(response.headers);
            const origin = request.headers.get('Origin');
            if (origin) {
                newHeaders.set('Access-Control-Allow-Origin', origin);
                newHeaders.set('Vary', 'Origin');
            } else {
                newHeaders.delete('Access-Control-Allow-Origin');
            }
            newHeaders.set('Access-Control-Allow-Credentials', 'true');
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
            });
        } catch (e) {
            console.error('反代请求失败:', e);
            return new Response(
                'Proxy Error: ' + (e?.message || String(e)),
                {
                    status: 502,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8'
                    }
                }
            );
        }
    }
};
