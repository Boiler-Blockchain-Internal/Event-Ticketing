// CORS + JSON for edge functions. Auth is a token in the body or Authorization header, never cookies.
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors })
