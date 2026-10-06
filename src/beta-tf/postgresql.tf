resource "random_password" "pg_admin_pass" {
  length = 20
}

resource "azurerm_postgresql_flexible_server" "db_server" {
  name                          = "${var.deployment_name}-db-server"
  resource_group_name           = azurerm_resource_group.rg.name
  location                      = var.location
  version                       = "18"
  delegated_subnet_id           = azurerm_subnet.sn-fs.id
  private_dns_zone_id           = azurerm_private_dns_zone.pdns.id
  public_network_access_enabled = false
  administrator_login           = "psql"
  administrator_password        = random_password.pg_admin_pass.result

  # TODO make these configurable:
  zone                  = "1"
  storage_mb            = 32768
  sku_name              = "GP_Standard_D2s_v3"
  backup_retention_days = 7

  depends_on = [azurerm_private_dns_zone_virtual_network_link.dns_link]
}

resource "azurerm_postgresql_flexible_server_database" "db" {
  name      = "${var.deployment_name}-db"
  server_id = azurerm_postgresql_flexible_server.db_server.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}
