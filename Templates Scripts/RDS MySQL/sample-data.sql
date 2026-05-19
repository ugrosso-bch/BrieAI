-- Demo Shark Tank - Sample Data
-- Base de datos de ejemplo para demostrar capacidades del chatbot

USE sharktank_demo;

-- Tabla de empresas
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    founded_year INT,
    valuation DECIMAL(15,2),
    employees INT,
    revenue DECIMAL(15,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de inversores
CREATE TABLE IF NOT EXISTS investors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    net_worth DECIMAL(15,2),
    specialty VARCHAR(100),
    total_investments INT DEFAULT 0,
    success_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de inversiones
CREATE TABLE IF NOT EXISTS investments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    investor_id INT,
    amount DECIMAL(15,2),
    equity_percentage DECIMAL(5,2),
    investment_date DATE,
    status ENUM('active', 'exited', 'failed') DEFAULT 'active',
    roi DECIMAL(10,2),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (investor_id) REFERENCES investors(id)
);

-- Insertar datos de empresas
INSERT INTO companies (name, industry, founded_year, valuation, employees, revenue, description) VALUES
('TechFlow Solutions', 'Software', 2020, 5000000.00, 25, 1200000.00, 'Plataforma de automatización de flujos de trabajo empresariales'),
('EcoGreen Energy', 'Energía Renovable', 2019, 15000000.00, 45, 3500000.00, 'Desarrollo de soluciones de energía solar para hogares'),
('FoodieBot', 'FoodTech', 2021, 2500000.00, 12, 800000.00, 'Robot de cocina inteligente con IA'),
('HealthTrack Pro', 'HealthTech', 2018, 8000000.00, 35, 2100000.00, 'Aplicación de monitoreo de salud y fitness'),
('CryptoSecure', 'FinTech', 2020, 12000000.00, 28, 1800000.00, 'Plataforma de trading de criptomonedas segura'),
('SmartHome Hub', 'IoT', 2019, 6500000.00, 22, 1500000.00, 'Sistema central para automatización del hogar'),
('EduLearn AI', 'EdTech', 2021, 4200000.00, 18, 950000.00, 'Plataforma de aprendizaje personalizado con IA'),
('GreenTransport', 'Movilidad', 2020, 18000000.00, 55, 4200000.00, 'Vehículos eléctricos para delivery urbano');

-- Insertar datos de inversores
INSERT INTO investors (name, net_worth, specialty, total_investments, success_rate) VALUES
('María González', 50000000.00, 'Software/Tech', 15, 73.33),
('Carlos Rodríguez', 75000000.00, 'FinTech', 22, 68.18),
('Ana Martínez', 35000000.00, 'HealthTech', 12, 83.33),
('Roberto Silva', 90000000.00, 'Energía/Sostenibilidad', 18, 77.78),
('Laura Fernández', 45000000.00, 'EdTech/AI', 10, 80.00),
('Diego Morales', 65000000.00, 'IoT/Hardware', 16, 75.00);

-- Insertar datos de inversiones
INSERT INTO investments (company_id, investor_id, amount, equity_percentage, investment_date, status, roi) VALUES
(1, 1, 500000.00, 15.00, '2021-03-15', 'active', 2.4),
(2, 4, 1200000.00, 12.00, '2020-08-22', 'active', 3.1),
(3, 1, 300000.00, 20.00, '2022-01-10', 'active', 1.8),
(4, 3, 800000.00, 18.00, '2019-11-05', 'active', 4.2),
(5, 2, 1000000.00, 14.00, '2021-06-18', 'active', 2.9),
(6, 6, 650000.00, 16.00, '2020-12-03', 'active', 2.1),
(7, 5, 420000.00, 22.00, '2022-04-12', 'active', 1.5),
(8, 4, 1500000.00, 10.00, '2021-09-28', 'active', 3.8),
(1, 2, 300000.00, 8.00, '2022-07-15', 'active', 1.2),
(4, 5, 200000.00, 5.00, '2021-02-20', 'active', 2.8);

-- Crear vistas útiles para análisis
CREATE VIEW investment_summary AS
SELECT 
    c.name as company_name,
    c.industry,
    i.name as investor_name,
    inv.amount,
    inv.equity_percentage,
    inv.investment_date,
    inv.roi,
    (inv.amount * inv.roi) as current_value
FROM investments inv
JOIN companies c ON inv.company_id = c.id
JOIN investors i ON inv.investor_id = i.id
WHERE inv.status = 'active';

CREATE VIEW industry_performance AS
SELECT 
    industry,
    COUNT(*) as total_companies,
    AVG(valuation) as avg_valuation,
    SUM(revenue) as total_revenue,
    AVG(employees) as avg_employees
FROM companies
GROUP BY industry
ORDER BY avg_valuation DESC;

CREATE VIEW investor_performance AS
SELECT 
    i.name,
    i.specialty,
    COUNT(inv.id) as total_investments,
    SUM(inv.amount) as total_invested,
    AVG(inv.roi) as avg_roi,
    SUM(inv.amount * inv.roi) as total_current_value
FROM investors i
LEFT JOIN investments inv ON i.id = inv.investor_id
WHERE inv.status = 'active' OR inv.status IS NULL
GROUP BY i.id, i.name, i.specialty
ORDER BY avg_roi DESC;