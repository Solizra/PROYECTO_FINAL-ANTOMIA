-- Script de configuración de base de datos para el proyecto ANTOMIA
-- Ejecutar este script después de instalar PostgreSQL

-- Crear la base de datos
CREATE DATABASE climatetech_db;

-- Conectar a la base de datos
\c climatetech_db;

-- Crear tabla Newsletter
CREATE TABLE "Newsletter" (
    id SERIAL PRIMARY KEY,
    link VARCHAR(500) NOT NULL,
    "Resumen" TEXT,
    titulo VARCHAR(300),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla Trends
CREATE TABLE "Trends" (
    id SERIAL PRIMARY KEY,
    id_newsletter INTEGER REFERENCES "Newsletter"(id),
    "Título_del_Trend" VARCHAR(300),
    "Link_del_Trend" VARCHAR(500),
    "Nombre_Newsletter_Relacionado" VARCHAR(300),
    "Fecha_Relación" TIMESTAMP,
    "Relacionado" BOOLEAN DEFAULT false,
    "Analisis_relacion" TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar algunos datos de ejemplo en Newsletter
INSERT INTO "Newsletter" (link, "Resumen", titulo) VALUES
('https://example.com/newsletter1', 'Resumen del primer newsletter sobre tecnología climática', 'Newsletter de Tecnología Climática #1'),
('https://example.com/newsletter2', 'Segundo newsletter sobre innovaciones verdes', 'Innovaciones Verdes #2'),
('https://example.com/newsletter3', 'Tercer newsletter sobre sostenibilidad', 'Sostenibilidad #3');

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_newsletter_titulo ON "Newsletter"(titulo);
CREATE INDEX idx_newsletter_fecha ON "Newsletter"(fecha_creacion);
CREATE INDEX idx_trends_fecha ON "Trends"("Fecha_Relación");

-- Verificar las tablas creadas
\dt

-- Verificar los datos insertados
SELECT * FROM "Newsletter";
SELECT * FROM "Trends";
