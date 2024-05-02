import { Hono } from "hono";
import { updateProductFluctuations } from "../../../services/fluctuations.js";

const fluctuationsRouter = new Hono()

// Actualizar fluctuaciones diarias de productos
fluctuationsRouter.put('/update', async (c) => {
    try {
        const result = await updateProductFluctuations();

        if (result.error) {
            c.status(409);
            return c.json({ error: result.error });
        }

        return c.json({ message: result.message });
    } catch (error) {
        console.error('Error en la actualización de productos:', error);
        c.status(500);
        return c.json({ error: 'Internal server error' });
    }
});

export default fluctuationsRouter
