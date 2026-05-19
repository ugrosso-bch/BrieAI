const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'demo-brieai-mysql.c0z2m86s2yeq.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'Prueba1234*',
  connectTimeout: 15000
};

async function run() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Conectado a RDS MySQL');

  // Crear y usar la base de datos
  await conn.query('CREATE DATABASE IF NOT EXISTS cheesebank');
  await conn.query('USE cheesebank');
  console.log('✅ Base de datos cheesebank lista');

  // ─── SCHEMA ───────────────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      apellido VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      telefono VARCHAR(20),
      fecha_nacimiento DATE,
      tipo_cliente ENUM('personal','empresarial') DEFAULT 'personal',
      ciudad VARCHAR(80),
      pais VARCHAR(60) DEFAULT 'Uruguay',
      fecha_alta DATE NOT NULL,
      activo TINYINT(1) DEFAULT 1
    )`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS cuentas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      numero_cuenta VARCHAR(20) UNIQUE NOT NULL,
      cliente_id INT NOT NULL,
      tipo ENUM('corriente','ahorro','plazo_fijo','inversion') NOT NULL,
      moneda ENUM('USD','UYU','EUR') DEFAULT 'USD',
      saldo DECIMAL(15,2) DEFAULT 0.00,
      tasa_interes DECIMAL(5,2) DEFAULT 0.00,
      fecha_apertura DATE NOT NULL,
      fecha_vencimiento DATE,
      estado ENUM('activa','bloqueada','cerrada') DEFAULT 'activa',
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS transacciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cuenta_origen_id INT,
      cuenta_destino_id INT,
      tipo ENUM('deposito','retiro','transferencia','pago','interes','comision') NOT NULL,
      monto DECIMAL(15,2) NOT NULL,
      moneda ENUM('USD','UYU','EUR') DEFAULT 'USD',
      descripcion VARCHAR(255),
      fecha DATETIME NOT NULL,
      estado ENUM('completada','pendiente','rechazada') DEFAULT 'completada',
      referencia VARCHAR(40) UNIQUE,
      FOREIGN KEY (cuenta_origen_id) REFERENCES cuentas(id),
      FOREIGN KEY (cuenta_destino_id) REFERENCES cuentas(id)
    )`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS prestamos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_id INT NOT NULL,
      tipo ENUM('hipotecario','personal','vehiculo','empresarial') NOT NULL,
      monto_original DECIMAL(15,2) NOT NULL,
      monto_pendiente DECIMAL(15,2) NOT NULL,
      tasa_interes DECIMAL(5,2) NOT NULL,
      cuotas_total INT NOT NULL,
      cuotas_pagadas INT DEFAULT 0,
      cuota_mensual DECIMAL(15,2) NOT NULL,
      fecha_inicio DATE NOT NULL,
      fecha_fin DATE NOT NULL,
      estado ENUM('activo','pagado','moroso','cancelado') DEFAULT 'activo',
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS tarjetas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_id INT NOT NULL,
      cuenta_id INT NOT NULL,
      numero_tarjeta VARCHAR(19) UNIQUE NOT NULL,
      tipo ENUM('debito','credito') NOT NULL,
      marca ENUM('Visa','Mastercard','AmEx') NOT NULL,
      limite_credito DECIMAL(15,2) DEFAULT 0.00,
      saldo_utilizado DECIMAL(15,2) DEFAULT 0.00,
      fecha_vencimiento DATE NOT NULL,
      estado ENUM('activa','bloqueada','vencida') DEFAULT 'activa',
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (cuenta_id) REFERENCES cuentas(id)
    )`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS sucursales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      ciudad VARCHAR(80) NOT NULL,
      direccion VARCHAR(200),
      gerente VARCHAR(100),
      telefono VARCHAR(20),
      activa TINYINT(1) DEFAULT 1
    )`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS empleados (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      apellido VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      cargo VARCHAR(80) NOT NULL,
      sucursal_id INT,
      salario DECIMAL(10,2),
      fecha_ingreso DATE NOT NULL,
      activo TINYINT(1) DEFAULT 1,
      FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
    )`);

  console.log('✅ Tablas creadas');
  await insertData(conn);
  await conn.end();
  console.log('\n🎉 CheeseBank populado exitosamente!');
}

async function insertData(conn) {
  // ─── SUCURSALES ───────────────────────────────────────────
  await conn.execute('DELETE FROM empleados'); await conn.execute('DELETE FROM transacciones');
  await conn.execute('DELETE FROM tarjetas'); await conn.execute('DELETE FROM prestamos');
  await conn.execute('DELETE FROM cuentas'); await conn.execute('DELETE FROM clientes');
  await conn.execute('DELETE FROM sucursales');
  await conn.query('ALTER TABLE sucursales AUTO_INCREMENT = 1');
  await conn.query('ALTER TABLE clientes AUTO_INCREMENT = 1');
  await conn.query('ALTER TABLE cuentas AUTO_INCREMENT = 1');

  const sucursales = [
    ['CheeseBank Central', 'Montevideo', 'Av. 18 de Julio 1234', 'Laura Quijano', '+598 2900 1234'],
    ['CheeseBank Pocitos', 'Montevideo', 'Bulevar España 2456', 'Marcos Ferreira', '+598 2710 5678'],
    ['CheeseBank Punta Carretas', 'Montevideo', 'Ellauri 350', 'Sofia Medina', '+598 2711 9012'],
    ['CheeseBank Punta del Este', 'Punta del Este', 'Gorlero 843', 'Diego Hernández', '+598 4244 3456'],
    ['CheeseBank Colonia', 'Colonia del Sacramento', 'Gral. Flores 567', 'Ana Pérez', '+598 4522 7890'],
  ];
  for (const s of sucursales) {
    await conn.execute('INSERT INTO sucursales (nombre,ciudad,direccion,gerente,telefono) VALUES (?,?,?,?,?)', s);
  }
  console.log('  ✓ Sucursales');

  // ─── CLIENTES ─────────────────────────────────────────────
  const clientes = [
    ['Carlos', 'González', 'carlos.gonzalez@gmail.com', '+598 91234567', '1985-03-15', 'personal', 'Montevideo', '2018-01-10'],
    ['María', 'Fernández', 'maria.fernandez@hotmail.com', '+598 92345678', '1990-07-22', 'personal', 'Montevideo', '2019-03-05'],
    ['Roberto', 'Sánchez', 'rsanchez@empresa.com.uy', '+598 93456789', '1978-11-08', 'empresarial', 'Montevideo', '2017-06-15'],
    ['Ana', 'Martínez', 'ana.martinez@gmail.com', '+598 94567890', '1995-02-28', 'personal', 'Punta del Este', '2020-08-20'],
    ['Jorge', 'López', 'jorge.lopez@outlook.com', '+598 95678901', '1982-09-14', 'personal', 'Colonia del Sacramento', '2016-04-12'],
    ['Valentina', 'Rodríguez', 'vrodriguez@bigcheese.com.uy', '+598 96789012', '1993-05-30', 'personal', 'Montevideo', '2021-01-18'],
    ['Diego', 'Pérez', 'dperez@techuy.com', '+598 97890123', '1987-12-03', 'empresarial', 'Montevideo', '2015-09-25'],
    ['Sofía', 'Herrera', 'sofia.herrera@gmail.com', '+598 98901234', '1998-08-17', 'personal', 'Montevideo', '2022-02-14'],
    ['Andrés', 'Vargas', 'avargas@constructora.uy', '+598 91122334', '1975-04-11', 'empresarial', 'Punta del Este', '2014-11-30'],
    ['Lucía', 'Castro', 'lucia.castro@gmail.com', '+598 92233445', '2000-01-25', 'personal', 'Montevideo', '2023-05-07'],
    ['Pablo', 'Morales', 'pablo.morales@yahoo.com', '+598 93344556', '1980-06-19', 'personal', 'Colonia del Sacramento', '2018-07-22'],
    ['Gabriela', 'Torres', 'gabriela.torres@empresa.uy', '+598 94455667', '1971-10-05', 'empresarial', 'Montevideo', '2013-03-15'],
    ['Nicolás', 'Jiménez', 'nicolas.jimenez@gmail.com', '+598 95566778', '1996-03-08', 'personal', 'Montevideo', '2021-09-12'],
    ['Isabella', 'Ruiz', 'isabella.ruiz@hotmail.com', '+598 96677889', '1989-07-14', 'personal', 'Punta del Este', '2019-12-01'],
    ['Matías', 'Núñez', 'matias.nunez@startup.uy', '+598 97788990', '1992-11-27', 'empresarial', 'Montevideo', '2020-04-08'],
  ];
  for (const c of clientes) {
    await conn.execute(
      'INSERT INTO clientes (nombre,apellido,email,telefono,fecha_nacimiento,tipo_cliente,ciudad,fecha_alta) VALUES (?,?,?,?,?,?,?,?)', c
    );
  }
  console.log('  ✓ Clientes');

  // ─── CUENTAS ──────────────────────────────────────────────
  const cuentas = [
    ['CB-001-2018-0001', 1, 'corriente', 'USD', 12450.75, 0.50, '2018-01-10', null],
    ['CB-001-2018-0002', 1, 'ahorro', 'UYU', 85000.00, 2.50, '2018-01-10', null],
    ['CB-001-2019-0003', 2, 'corriente', 'USD', 3200.50, 0.50, '2019-03-05', null],
    ['CB-001-2019-0004', 2, 'ahorro', 'USD', 18750.00, 3.00, '2019-03-05', null],
    ['CB-001-2017-0005', 3, 'corriente', 'USD', 245000.00, 1.00, '2017-06-15', null],
    ['CB-001-2017-0006', 3, 'inversion', 'USD', 500000.00, 5.25, '2017-06-15', '2027-06-15'],
    ['CB-001-2020-0007', 4, 'ahorro', 'USD', 8900.25, 3.00, '2020-08-20', null],
    ['CB-001-2016-0008', 5, 'corriente', 'UYU', 45000.00, 0.50, '2016-04-12', null],
    ['CB-001-2016-0009', 5, 'plazo_fijo', 'USD', 25000.00, 4.75, '2021-01-15', '2026-01-15'],
    ['CB-001-2021-0010', 6, 'corriente', 'USD', 5600.00, 0.50, '2021-01-18', null],
    ['CB-001-2015-0011', 7, 'corriente', 'USD', 380000.00, 1.00, '2015-09-25', null],
    ['CB-001-2015-0012', 7, 'inversion', 'USD', 1200000.00, 5.75, '2015-09-25', '2028-09-25'],
    ['CB-001-2022-0013', 8, 'ahorro', 'UYU', 22000.00, 2.50, '2022-02-14', null],
    ['CB-001-2014-0014', 9, 'corriente', 'USD', 620000.00, 1.00, '2014-11-30', null],
    ['CB-001-2023-0015', 10, 'ahorro', 'USD', 1500.00, 3.00, '2023-05-07', null],
    ['CB-001-2018-0016', 11, 'corriente', 'UYU', 38000.00, 0.50, '2018-07-22', null],
    ['CB-001-2013-0017', 12, 'corriente', 'USD', 175000.00, 1.00, '2013-03-15', null],
    ['CB-001-2013-0018', 12, 'inversion', 'USD', 800000.00, 5.50, '2013-03-15', '2026-03-15'],
    ['CB-001-2021-0019', 13, 'ahorro', 'USD', 4200.00, 3.00, '2021-09-12', null],
    ['CB-001-2019-0020', 14, 'corriente', 'USD', 9800.00, 0.50, '2019-12-01', null],
    ['CB-001-2020-0021', 15, 'corriente', 'USD', 95000.00, 1.00, '2020-04-08', null],
  ];
  for (const c of cuentas) {
    await conn.execute(
      'INSERT INTO cuentas (numero_cuenta,cliente_id,tipo,moneda,saldo,tasa_interes,fecha_apertura,fecha_vencimiento) VALUES (?,?,?,?,?,?,?,?)', c
    );
  }
  console.log('  ✓ Cuentas');

  // ─── TRANSACCIONES ────────────────────────────────────────
  const tx = [
    [1, null, 'deposito', 5000.00, 'USD', 'Depósito nómina enero', '2024-01-05 09:15:00', 'TXN-2024-0001'],
    [null, 1, 'deposito', 2500.00, 'USD', 'Transferencia recibida', '2024-01-08 14:30:00', 'TXN-2024-0002'],
    [1, 3, 'transferencia', 800.00, 'USD', 'Pago servicios', '2024-01-12 11:20:00', 'TXN-2024-0003'],
    [3, null, 'retiro', 500.00, 'USD', 'Retiro ATM Pocitos', '2024-01-15 18:45:00', 'TXN-2024-0004'],
    [5, 1, 'transferencia', 15000.00, 'USD', 'Pago proveedor CheeseBank', '2024-01-18 10:00:00', 'TXN-2024-0005'],
    [1, null, 'pago', 1200.00, 'USD', 'Pago tarjeta crédito', '2024-01-22 09:30:00', 'TXN-2024-0006'],
    [null, 2, 'interes', 177.08, 'UYU', 'Acreditación intereses enero', '2024-01-31 23:59:00', 'TXN-2024-0007'],
    [null, 4, 'interes', 46.88, 'USD', 'Acreditación intereses enero', '2024-01-31 23:59:00', 'TXN-2024-0008'],
    [null, 1, 'deposito', 5000.00, 'USD', 'Depósito nómina febrero', '2024-02-05 09:15:00', 'TXN-2024-0009'],
    [7, 10, 'transferencia', 3000.00, 'USD', 'Pago honorarios', '2024-02-10 16:00:00', 'TXN-2024-0010'],
    [11, 5, 'transferencia', 50000.00, 'USD', 'Pago importación', '2024-02-14 11:30:00', 'TXN-2024-0011'],
    [10, null, 'retiro', 1000.00, 'USD', 'Retiro efectivo', '2024-02-18 14:20:00', 'TXN-2024-0012'],
    [null, 14, 'deposito', 100000.00, 'USD', 'Depósito inversión proyecto', '2024-02-20 09:00:00', 'TXN-2024-0013'],
    [3, 7, 'transferencia', 2000.00, 'USD', 'Transferencia amiga', '2024-02-25 19:10:00', 'TXN-2024-0014'],
    [1, null, 'comision', 15.00, 'USD', 'Comisión mantenimiento cuenta', '2024-02-29 08:00:00', 'TXN-2024-0015'],
    [null, 1, 'deposito', 5000.00, 'USD', 'Depósito nómina marzo', '2024-03-05 09:15:00', 'TXN-2024-0016'],
    [5, 11, 'transferencia', 25000.00, 'USD', 'Pago servicios corporativos', '2024-03-08 10:30:00', 'TXN-2024-0017'],
    [19, null, 'retiro', 500.00, 'USD', 'Retiro ATM', '2024-03-12 12:00:00', 'TXN-2024-0018'],
    [null, 15, 'deposito', 500.00, 'USD', 'Ahorro mensual', '2024-03-15 09:00:00', 'TXN-2024-0019'],
    [17, 21, 'transferencia', 30000.00, 'USD', 'Inversión startup', '2024-03-20 15:45:00', 'TXN-2024-0020'],
    [1, null, 'pago', 850.00, 'USD', 'Pago seguro hogar', '2024-03-25 10:00:00', 'TXN-2024-0021'],
    [null, 4, 'interes', 46.88, 'USD', 'Intereses marzo', '2024-03-31 23:59:00', 'TXN-2024-0022'],
    [null, 1, 'deposito', 5000.00, 'USD', 'Depósito nómina abril', '2024-04-05 09:15:00', 'TXN-2024-0023'],
    [3, 19, 'transferencia', 1500.00, 'USD', 'Préstamo a amigo', '2024-04-10 17:30:00', 'TXN-2024-0024'],
    [11, null, 'retiro', 10000.00, 'USD', 'Retiro para operaciones', '2024-04-15 11:00:00', 'TXN-2024-0025'],
    [14, 5, 'transferencia', 200000.00, 'USD', 'Pago proyecto construcción', '2024-04-18 09:30:00', 'TXN-2024-0026'],
    [7, null, 'pago', 4500.00, 'USD', 'Pago impuestos DGI', '2024-04-22 14:00:00', 'TXN-2024-0027'],
    [null, 13, 'deposito', 5000.00, 'UYU', 'Depósito efectivo', '2024-04-28 10:30:00', 'TXN-2024-0028'],
    [1, null, 'comision', 15.00, 'USD', 'Comisión mantenimiento', '2024-04-30 08:00:00', 'TXN-2024-0029'],
    [null, 1, 'deposito', 5000.00, 'USD', 'Depósito nómina mayo', '2024-05-05 09:15:00', 'TXN-2024-0030'],
  ];
  for (const t of tx) {
    await conn.execute(
      'INSERT INTO transacciones (cuenta_origen_id,cuenta_destino_id,tipo,monto,moneda,descripcion,fecha,referencia) VALUES (?,?,?,?,?,?,?,?)', t
    );
  }
  console.log('  ✓ Transacciones');

  // ─── PRÉSTAMOS ────────────────────────────────────────────
  const prestamos = [
    [1, 'personal', 15000.00, 8500.00, 12.50, 36, 22, 499.67, '2021-06-01', '2024-06-01'],
    [3, 'empresarial', 200000.00, 145000.00, 8.75, 60, 26, 4139.46, '2020-02-15', '2025-02-15'],
    [5, 'hipotecario', 350000.00, 290000.00, 6.25, 240, 50, 2556.90, '2019-09-01', '2039-09-01'],
    [7, 'empresarial', 500000.00, 320000.00, 7.50, 84, 42, 7642.35, '2018-11-01', '2025-11-01'],
    [9, 'vehiculo', 35000.00, 18000.00, 10.75, 48, 24, 900.83, '2022-03-01', '2026-03-01'],
    [4, 'personal', 8000.00, 6200.00, 14.00, 24, 7, 384.89, '2023-10-01', '2025-10-01'],
    [12, 'hipotecario', 280000.00, 260000.00, 5.90, 300, 8, 1762.40, '2023-05-01', '2048-05-01'],
    [14, 'empresarial', 750000.00, 750000.00, 6.80, 120, 0, 8623.30, '2024-04-01', '2034-04-01'],
  ];
  for (const p of prestamos) {
    await conn.execute(
      'INSERT INTO prestamos (cliente_id,tipo,monto_original,monto_pendiente,tasa_interes,cuotas_total,cuotas_pagadas,cuota_mensual,fecha_inicio,fecha_fin) VALUES (?,?,?,?,?,?,?,?,?,?)', p
    );
  }
  console.log('  ✓ Préstamos');

  // ─── TARJETAS ─────────────────────────────────────────────
  const tarjetas = [
    [1, 1, '4532 0151 2345 6789', 'debito', 'Visa', 0, 0, '2026-12-31'],
    [1, 1, '5425 2334 3010 9903', 'credito', 'Mastercard', 10000.00, 3200.50, '2027-03-31'],
    [2, 3, '4916 3382 1234 5678', 'debito', 'Visa', 0, 0, '2027-06-30'],
    [3, 5, '3714 496353 98431', 'credito', 'AmEx', 50000.00, 12400.00, '2026-09-30'],
    [4, 7, '4539 1488 0343 6467', 'debito', 'Visa', 0, 0, '2028-02-28'],
    [5, 8, '5105 1051 0510 5100', 'debito', 'Mastercard', 0, 0, '2026-04-30'],
    [6, 10, '4916 1234 5678 9012', 'credito', 'Visa', 5000.00, 890.00, '2027-09-30'],
    [7, 11, '3782 822463 10005', 'credito', 'AmEx', 75000.00, 28000.00, '2025-12-31'],
    [8, 13, '4532 9876 5432 1098', 'debito', 'Visa', 0, 0, '2028-08-31'],
    [9, 14, '5425 1111 2222 3333', 'credito', 'Mastercard', 80000.00, 5000.00, '2026-06-30'],
  ];
  for (const t of tarjetas) {
    await conn.execute(
      'INSERT INTO tarjetas (cliente_id,cuenta_id,numero_tarjeta,tipo,marca,limite_credito,saldo_utilizado,fecha_vencimiento) VALUES (?,?,?,?,?,?,?,?)', t
    );
  }
  console.log('  ✓ Tarjetas');

  // ─── EMPLEADOS ────────────────────────────────────────────
  const empleados = [
    ['Laura', 'Quijano', 'l.quijano@cheesebank.com.uy', 'Gerente de Sucursal', 1, 4800.00, '2015-03-01'],
    ['Marcos', 'Ferreira', 'm.ferreira@cheesebank.com.uy', 'Gerente de Sucursal', 2, 4800.00, '2016-07-15'],
    ['Sofia', 'Medina', 's.medina@cheesebank.com.uy', 'Gerente de Sucursal', 3, 4800.00, '2017-02-01'],
    ['Diego', 'Hernández', 'd.hernandez@cheesebank.com.uy', 'Gerente de Sucursal', 4, 5200.00, '2014-11-01'],
    ['Ana', 'Pérez', 'a.perez@cheesebank.com.uy', 'Gerente de Sucursal', 5, 4800.00, '2018-04-15'],
    ['Ricardo', 'Fontaine', 'r.fontaine@cheesebank.com.uy', 'Asesor Financiero', 1, 3200.00, '2019-01-10'],
    ['Camila', 'Ibáñez', 'c.ibanez@cheesebank.com.uy', 'Cajera', 1, 2400.00, '2020-06-01'],
    ['Tomás', 'Blanco', 't.blanco@cheesebank.com.uy', 'Cajero', 2, 2400.00, '2021-03-15'],
    ['Florencia', 'Ríos', 'f.rios@cheesebank.com.uy', 'Asesora Comercial', 3, 3000.00, '2019-09-01'],
    ['Sebastián', 'Acosta', 's.acosta@cheesebank.com.uy', 'Analista de Riesgo', 1, 3600.00, '2018-05-20'],
  ];
  for (const e of empleados) {
    await conn.execute(
      'INSERT INTO empleados (nombre,apellido,email,cargo,sucursal_id,salario,fecha_ingreso) VALUES (?,?,?,?,?,?,?)', e
    );
  }
  console.log('  ✓ Empleados');
}

run().catch(e => {
  console.error('❌ ERROR:', e.message);
  process.exit(1);
});
