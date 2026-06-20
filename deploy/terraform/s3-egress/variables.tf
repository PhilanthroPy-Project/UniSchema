variable "bucket_name" {
  type        = string
  description = "Globally unique S3 bucket name for ConstituentEvent NDJSON batches"
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for the egress bucket"
}

variable "enable_versioning" {
  type        = bool
  default     = true
  description = "Enable S3 versioning on the egress bucket"
}
