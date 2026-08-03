-- =============================================================================
-- gruafy — color del vehículo (para que el gruero identifique el auto/moto)
-- =============================================================================
alter table vehicles add column if not exists color text;
