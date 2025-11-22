/*
METHOD=POST
BODY={ 
  "key": "name", 
  "value": "toh"
  }
omit "value" to retrieve the existing value by key
*/
export default defineEventHandler(async (event) => {
  console.log(event)
  const { key, value } = await readBody(event);

  const KV = event.context.cloudflare.env.CF_NUXT_KV;

  if (value) {
    await KV.put(key, value);
    return new Response("OK");
  }

  const result = await KV.get(key);
  return new Response(result);
});
