terraform {
  backend "azurerm" {
    # TODO: Pass these via -backend-config=""
    # resource_group_name  = azurerm_resources_group.rg.name
    # storage_account_name = var.tf_workspace_storage_account_name
    # container_name       = var.tf_workspace_storage_container_name
    # key                  = "${var.deployment_name}.tfstate"
  }
}
