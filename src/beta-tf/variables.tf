variable "deployment_name" {
  description = "A name for this deployment, distinct from all others in this account. Must consist only of lowercase letters."
  type        = string
}

variable "location" {
  description = "Azure location for the deploument"
  type        = string
  default     = "uksouth"
}

variable "resource_group" {
  description = "The name of the resource group to create it all in"
  type = string
}