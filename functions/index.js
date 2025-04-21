function uint8ArrayToHex(arr) {
    return Array.prototype.map.call(arr, (x) => ((`0${x.toString(16)}`).slice(-2))).join('');
}

async function md5(str) {
    const encodeArr = TextEncoder().encode(str);
    const md5Buffer = await crypto.subtle.digest({ name: 'MD5' }, encodeArr);
    return uint8ArrayToHex(new Uint8Array(md5Buffer));
}

async function getToken() {
    const ts = Date.now();
    const authKey = await md5("testtest" + ts);
    const resp = await fetch("https://hlwicpfwc.miit.gov.cn/icpproject_query/api/auth", {
        "headers": {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Referer": "https://beian.miit.gov.cn/",
            "Cookie": "__jsluid_s=6452684553c30942fcb8cff8d5aa5a5b",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124"
        },
        "body": `authKey=${authKey}&timeStamp=${ts}`,
        "method": "POST"
    });
    const json = await resp.json();
    if (json.code !== 200) {
        throw new Error("获取token失败" + json.msg);
    }
    return json.params.bussiness;
}

async function query(domain, token, sign) {
    const resp = await fetch("https://hlwicpfwc.miit.gov.cn/icpproject_query/api/auth", {
        "headers": {
            "content-type": "application/json; charset=UTF-8",
            "Referer": "https://beian.miit.gov.cn/",
            "Cookie": "__jsluid_s=6452684553c30942fcb8cff8d5aa5a5b",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124",
            "Token": token,
            "Sign": sign,
        },
        "body": JSON.stringify({ "pageNum": "", "pageSize": "", "unitName": domain, "serviceType": 1 }),
        "method": "POST"
    });
    const json = await resp.json();
    if (json.code !== 200) {
        throw new Error("查询失败" + json.msg);
    }
    return json.params;
}

export async function onRequest({ request }) {
    const url = new URL(request.url);
    const domain = url.searchParams.get("domain");
    const sign = url.searchParams.get("sign");
    if (!domain || !sign) {
        return new Response(JSON.stringify({
            code: 400,
            msg: "missing domain or sign",
        }), {
            headers: {
                'content-type': 'application/json; charset=UTF-8',
                'Access-Control-Allow-Origin': '*',
            },
            status: 400,
        });
    }
    const token = await getToken();
    const res = JSON.stringify({
        code: 200,
        msg: "ok",
        data: await query(domain, token, sign),
    });

    return new Response(res, {
        headers: {
            'content-type': 'application/json; charset=UTF-8',
            'Access-Control-Allow-Origin': '*',
            status: 200,
        },
    });
}
