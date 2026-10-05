resource "azuremr_resource_group" "rg" {
  name     = "${var.deployment_name}-rg"
  location = var.location
}

resource "azurerm_virtual_network" "net" {
  name                = "${var.deployment_name}-net"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name
  address_space       = ["10.0.0.0/16"]
}

resource "azurerm_network_security_group" "nsg" {
  name                = "${var.deployment_name}-nsg"
  location            = var.location
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    # name                       = "test123"
    # priority                   = 100
    # direction                  = "Inbound"
    # access                     = "Allow"
    # protocol                   = "Tcp"
    # source_port_range          = "*"
    # destination_port_range     = "*"
    # source_address_prefix      = "*"
    # destination_address_prefix = "*"
  }
}

resource "azurerm_subnet" "sn" {
  name                 = "${var.deployment_name}-sn"
  virtual_network_name = azurerm_virtual_network.net.name
  resource_group_name  = azurerm_resource_group.rg.name
  address_prefixes     = ["10.0.2.0/24"]
  service_endpoints    = ["Microsoft.Storage"]

  delegation {
    name = "fs"

    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"

      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_subnet_network_security_group_association" "sg_assoc" {
  subnet_id                 = azurerm_subnet.sn.id
  network_security_group_id = azurerm_network_security_group.sg.id
}

resource "azurerm_private_dns_zone" "pdns" {
  name                = "${var.deployment_name}.compass.local"
  resource_group_name = azurerm_resource_group.rg.name

  depends_on = [azurerm_subnet_network_security_group_association.sg_assoc]
}

resource "azurerm_private_dns_zone_virtual_network_link" "dns_link" {
  name                  = "${var.deployment_name}-dns_link"
  private_dns_zone_name = azurerm_private_dns_zone.pdns.name
  virtual_network_id    = azurerm_virtual_network.net.id
  resource_group_name   = azurerm_resource_group.rg.name
}
