resource "azurerm_log_analytics_workspace" "law" {
  name                = "${var.deployment_name}-law"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018" # TODO make configurable
  retention_in_days   = 30          # TODO make configurable
}
