import 'dotenv/config';
import express from "express";
import cors from "cors";
import NewsletterRouter from './Controllers/Newsletter-controller.js'
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());


// Definición de rutas principales (cada una con su controlador y servicio detrás)
app.use('/api/Newsletter', NewsletterRouter); // http://localhost:3000/api/Newsletter

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
