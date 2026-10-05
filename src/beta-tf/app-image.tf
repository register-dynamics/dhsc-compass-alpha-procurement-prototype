resource "azurerm_container_registry" "acr" {
  name                  = "${var.deployment_name}-acr"
  resource_group_name   = azurerm_resource_group.rg.name
  location              = var.location
  sku                   = "Premium" # TODO make configurable
  admin_enabled         = false
  anonymous_pull_enable = false
}

resource "docker_registry_image" "app_image" {
  name          = "${azurerm_container_registry.acr.login_server}/${var.deployment_name}-app"
  keep_remotely = false
  build {
    context = "../beta-app"
  }
  triggers = {
    dir_sha1 = sha1(join("", [for f in fileset(path.module, "../beta-app/**") : filesha1(f)]))
  }
}
