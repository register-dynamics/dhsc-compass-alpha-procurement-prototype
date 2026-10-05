terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.1.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.4.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 4.6.0"
    }
  }
}

provider "azurerm" {
  features {}
}

provider "docker" {
  registry_auth {
    address  = azurerm_container_registry.acr.login_server
    username = azurerm_container_registry.acr.admin_username
    password = azurerm_container_registry.acr.admin_password
  }
}
