import { Hono } from "hono";
import { RegExpRouter } from "hono/router/reg-exp-router";
import { SmartRouter } from "hono/router/smart-router";
import { TrieRouter } from "hono/router/trie-router";
import fluctuationsRouter from "./fluctuations";
import productsRouter from "./products";

const api = new Hono({
    router: new SmartRouter({
        routers: [new RegExpRouter(), new TrieRouter()],
    })
});

api.route('products', productsRouter)
api.route('fluctuations', fluctuationsRouter)


export default api;
