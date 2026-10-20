variable "deployment_name" {
  description = "A name for this deployment, distinct from all others in this account. Must consist only of lowercase letters."
  type        = string
}

variable "location" {
  description = "Azure location for the deploument"
  type        = string
  default     = "uksouth"
}

variable "rg_name" {
  description = "Resource group name"
  type        = string
}

variable "pdns_zone_name" {
  description = "Private DNS zone name"
  type        = string
}

variable "vnet_name" {
  description = "Virtual network name"
  type        = string
}

variable "law_name" {
  description = "Log analytics workspace name"
}

variable "subnet_id" {
  description = "Subnet ID"
}


## TODOs:

# PE Subnet for accessing blob store
# AMPLS for monitoring


# ACR - Premium

# Push to Github container registry for public things then pull it from ACR for better caching
