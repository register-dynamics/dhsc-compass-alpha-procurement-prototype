resource "azurerm_key_vault" "kv" {
  name                       = "${var.deployment_name}-kv"
  location                   = var.location
  resource_group_name        = azurerm_resource_group.rg.name
  rbac_authorization_enabled = false
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"
  soft_delete_retention_days = 7

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Create",
      "Get",
    ]

    secret_permissions = [
      "Set",
      "Get",
      "Delete",
      "Purge",
      "Recover"
    ]
  }
}

resource "azurerm_key_vault_secret" "acr_registry_password" {
  name         = "${var.deployment_name}-acr-registry-password"
  value        = azurerm_container_registry.acr.admin_password
  key_vault_id = azurerm_key_vault.example.id
}
