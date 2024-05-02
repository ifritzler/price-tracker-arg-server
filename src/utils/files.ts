import fs from 'node:fs/promises'

export async function saveDataToFile(filename: string, data: Record<string, any>) {
    try {
        // Leer el archivo existente (si existe)
        let existingData = [];
        try {
            const fileData = await fs.readFile(filename, 'utf8');
            existingData = JSON.parse(fileData);
        } catch (error) {
            // Si el archivo no existe o está vacío, no se hace nada
        }

        // Agregar el nuevo dato al array existente
        existingData.push(data);

        // Escribir los datos actualizados en el archivo
        await fs.writeFile(filename, JSON.stringify(existingData, null, 2));
        console.info(`Dato guardado en el archivo ${filename}`);
    } catch (error) {
        console.error(`Error al guardar datos en el archivo ${filename}:`, error);
    }
}
