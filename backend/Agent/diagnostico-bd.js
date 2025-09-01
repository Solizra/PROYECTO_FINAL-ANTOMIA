// Script de diagnóstico para verificar el estado de la base de datos
import fetch from 'node-fetch';

async function diagnosticarBD() {
  console.log('🔍 DIAGNÓSTICO DE BASE DE DATOS');
  console.log('=' .repeat(50));
  
  try {
    // 1. Verificar si el servidor está ejecutándose
    console.log('\n1️⃣ Verificando servidor backend...');
    const response = await fetch('http://localhost:3000/api/Newsletter?limit=1&page=1', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`Servidor no responde correctamente: ${response.status} ${response.statusText}`);
    }
    
    // 2. Verificar respuesta de la API
    console.log('\n2️⃣ Verificando respuesta de la API...');
    const data = await response.json();
    console.log(`📄 Tipo de respuesta: ${typeof data}`);
    console.log(`📄 Es array: ${Array.isArray(data)}`);
    
    if (Array.isArray(data)) {
      console.log(`📧 Total de newsletters: ${data.length}`);
      
      if (data.length > 0) {
        console.log('\n3️⃣ Estructura del primer newsletter:');
        const firstNL = data[0];
        console.log(`   ID: ${firstNL.id}`);
        console.log(`   Título: ${firstNL.titulo || 'Sin título'}`);
        console.log(`   Link: ${firstNL.link || 'Sin link'}`);
        console.log(`   Resumen: ${firstNL.Resumen ? firstNL.Resumen.substring(0, 100) + '...' : 'Sin resumen'}`);
        
        // Verificar campos requeridos
        console.log('\n4️⃣ Verificación de campos:');
        console.log(`   ✅ ID presente: ${!!firstNL.id}`);
        console.log(`   ✅ Título presente: ${!!firstNL.titulo}`);
        console.log(`   ✅ Link presente: ${!!firstNL.link}`);
        console.log(`   ✅ Resumen presente: ${!!firstNL.Resumen}`);
      } else {
        console.log('\n⚠️ PROBLEMA: No hay newsletters en la base de datos');
        console.log('💡 Soluciones:');
        console.log('   1. Verifica que la tabla Newsletter tenga datos');
        console.log('   2. Ejecuta el script de inserción de datos de prueba');
        console.log('   3. Verifica la conexión a la base de datos');
      }
    } else {
      console.log('\n❌ PROBLEMA: La respuesta no es un array');
      console.log('📄 Contenido de la respuesta:', data);
    }
    
    // 3. Probar con límite alto
    console.log('\n5️⃣ Probando con límite alto...');
    const response2 = await fetch('http://localhost:3000/api/Newsletter?limit=10000&page=1', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log(`✅ Con límite alto: ${data2.length} newsletters`);
    } else {
      console.log(`❌ Error con límite alto: ${response2.status}`);
    }
    
    // 4. Resumen del diagnóstico
    console.log('\n📋 RESUMEN DEL DIAGNÓSTICO:');
    if (Array.isArray(data) && data.length > 0) {
      console.log('✅ Base de datos funcionando correctamente');
      console.log('✅ Hay newsletters disponibles');
      console.log('✅ API respondiendo correctamente');
    } else if (Array.isArray(data) && data.length === 0) {
      console.log('⚠️ Base de datos conectada pero sin newsletters');
      console.log('💡 Necesitas insertar datos de prueba');
    } else {
      console.log('❌ Problema con la estructura de datos');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR EN EL DIAGNÓSTICO:', error.message);
    console.log('\n💡 POSIBLES SOLUCIONES:');
    console.log('   1. Verifica que el servidor backend esté ejecutándose');
    console.log('   2. Verifica que la base de datos esté conectada');
    console.log('   3. Verifica que la tabla Newsletter exista');
    console.log('   4. Verifica que haya datos en la tabla Newsletter');
  }
}

// Ejecutar diagnóstico
diagnosticarBD();
