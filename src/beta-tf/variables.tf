variable "deployment_name" {
  description = "A name for this deployment, distinct from all others in this account. May container [a-zA-Z0-9] and underscores."
  type        = string
}

variable "location" {
  description = "Azure location for the deploument"
  type        = string
  default     = "uksouth"
}
