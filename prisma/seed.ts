import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
    const frutasYVerduras = await prisma.category.upsert({
        where: { name: 'Frutas y Verduras' },
        update: {},
        create: {
            name: 'Frutas y Verduras',
        },
    })
    
    const carnesYPescados = await prisma.category.upsert({
        where: { name: 'Carnes y Pescados' },
        update: {},
        create: {
            name: 'Carnes y Pescados',
        },
    })
    
    const lacteosYProductosFrescos = await prisma.category.upsert({
        where: { name: 'Lácteos y productos frescos' },
        update: {},
        create: {
            name: 'Lácteos y productos frescos',
        },
    })
    
    const panaderia = await prisma.category.upsert({
        where: { name: 'Panadería' },
        update: {},
        create: {
            name: 'Panadería',
        }
    })
    
    const congelados = await prisma.category.upsert({
        where: { name: 'Congelados' },
        update: {},
        create: {
            name: 'Congelados',
        }
    })
    
    const desayunoYMerenda = await prisma.category.upsert({
        where: { name: 'Desayuno y merienda' },
        update: {},
        create: {
            name: 'Desayuno y merienda',
        }
    })

    const bebidas = await prisma.category.upsert({
        where: { name: 'Bebidas' },
        update: {},
        create: {
            name: 'Bebidas',
        }
    })
    const almacen = await prisma.category.upsert({
        where: { name: 'Almacén' },
        update: {},
        create: {
            name: 'Almacén',
        }
    })
    const mundoBebe = await prisma.category.upsert({
        where: { name: 'Mundo bebé' },
        update: {},
        create: {
            name: 'Mundo bebé',
        }
    })
    const bazarYTextil = await prisma.category.upsert({
        where: { name: 'Bazar y textil' },
        update: {},
        create: {
            name: 'Bazar y textil',
        }
    })
    const electroYTecnologia = await prisma.category.upsert({
        where: { name: 'Electro y tecnología' },
        update: {},
        create: {
            name: 'Electro y tecnología',
        }
    })
    const limpieza = await prisma.category.upsert({
        where: { name: 'Limpieza' },
        update: {},
        create: {
            name: 'Limpieza',
        }
    })
    const perfumeria = await prisma.category.upsert({
        where: { name: 'Perfumería' },
        update: {},
        create: {
            name: 'Perfumería',
        }
    })
    const mascotas = await prisma.category.upsert({
        where: { name: 'Mascotas' },
        update: {},
        create: {
            name: 'Mascotas',
        }
    })
    const indumentaria = await prisma.category.upsert({
        where: { name: 'Indumentaria' },
        update: {},
        create: {
            name: 'Indumentaria',
        }
    })
    console.log({ frutasYVerduras, carnesYPescados, lacteosYProductosFrescos, panaderia, congelados, desayunoYMerenda })
    console.log({ bebidas, almacen, mundoBebe, bazarYTextil, electroYTecnologia, limpieza, perfumeria, mascotas, indumentaria })
    
    // supermecados, coto y carrefour
    const coto = await prisma.supermarket.upsert({
        where: { name: 'coto' },
        update: {},
        create: {
            name: 'coto',
        },
    })

    const carrefour = await prisma.supermarket.upsert({
        where: { name: 'carrefour' },
        update: {},
        create: {
            name: 'carrefour',
        },
    })

    console.log({ coto, carrefour })
}
main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })