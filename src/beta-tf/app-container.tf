resource "azurerm_container_app_environment" "app_env" {
  name                       = "${var.deployment_name}-app_env"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.law.id
  infrastructure_subnet_id   = azurerm_subnet.sn-app.id
}

resource "azurerm_container_app" "app" {
  name                         = "${var.deployment_name}-app"
  container_app_environment_id = azurerm_container_app_environment.app_env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  registry {
    server               = azurerm_container_registry.acr.login_server
    username             = azurerm_container_registry.acr.admin_username
    password_secret_name = azurerm_key_vault_secret.acr_registry_password.name
  }

  template {
    container {
      name   = "${var.deployment_name}-container"
      image  = docker_registry_image.app_image.name
      cpu    = 0.25    # TODO: COnfigurable
      memory = "0.5Gi" # TODO: Configurable
      env {
        name  = "DATABASE_NAME"
        value = azurerm_postgresql_flexible_server_database.db.name
      }
      env {
        name  = DATABASE_USER
        value = azurerm_postgresql_flexible_server.db_server.administrator_login
      }
      env {
        name  = DATABASE_HOST
        value = azurerm_postgresql_flexible_server.db_server.fqdn
      }
      env {
        name  = DATABASE_PASSWORD
        value = azurerm_postgresql_flexible_server.db_server.administrator_password
      }
    }
  }
}
