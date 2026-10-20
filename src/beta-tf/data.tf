data "azurerm_client_config" "current" {}

data "azurerm_virtual_network" "vnet" {
  name                = var.vnet_name
  resource_group_name = var.rg_name
}

data "azurerm_private_dns_zone" "pdns" {
  name                = var.pdns_zone_name
  resource_group_name = var.rg_name
}

data "azurerm_log_analytics_workspace" "law" {
  name                = var.law_name
  resource_group_name = var.rg_name
}
