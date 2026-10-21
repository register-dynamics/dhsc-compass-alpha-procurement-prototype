resource "azurerm_container_registry" "acr" {
  name                   = var.deployment_name
  resource_group_name    = var.rg_name
  location               = var.location
  sku                    = "Premium"
  admin_enabled          = false
  anonymous_pull_enabled = false
}

resource "docker_registry_image" "app_image" {
  # TODO: Actually push to github CR and then pull it across to the ACR, this gets us better caching
  name          = "${azurerm_container_registry.acr.login_server}/${var.deployment_name}-app"
  keep_remotely = false
  build {
    context = "../beta-app"
  }
  triggers = {
    dir_sha1 = sha1(join("", [for f in fileset(path.module, "../beta-app/**") : filesha1(f)]))
  }
}
