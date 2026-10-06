# Useful things for us to tinker with it

output "db_server" {
  value = azurerm_postgresql_flexible_server.db_server.name
}

output "db_name" {
  value = azurerm_postgresql_flexible_server_database.db.name
}

output "db_host" {
  value = azurerm_postgresql_flexible_server.db_server.fqdn
}

output "db_user" {
  value = azurerm_postgresql_flexible_server.db_server.administrator_login
}

output "db_password" {
  sensitive = true
  value     = azurerm_postgresql_flexible_server.db_server.administrator_password
}
