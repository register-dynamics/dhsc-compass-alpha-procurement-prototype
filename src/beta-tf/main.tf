resource "azurerm_private_dns_zone_virtual_network_link" "dns_link" {
  name                = "${var.deployment_name}-dns_link"
  private_dns_zone_id = data.azurerm_private_dns_zone.pdns.id
  virtual_network_id  = data.azurerm_virtual_network.vnet.id
}
