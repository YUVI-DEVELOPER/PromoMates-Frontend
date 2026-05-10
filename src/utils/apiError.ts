import axios from "axios";


export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item?.message === "string") {
            return item.message;
          }
          if (typeof item?.msg === "string") {
            return item.msg;
          }
          return "Invalid request.";
        })
        .join(" ");
    }

    if (error.response?.status === 403) {
      return "You do not have permission to perform this action.";
    }

    if (error.message) {
      return error.message;
    }
  }

  return "Something went wrong. Please try again.";
}


export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) {
    return {};
  }

  const detail = error.response?.data?.detail;
  if (!Array.isArray(detail)) {
    return {};
  }

  return detail.reduce<Record<string, string>>((fieldErrors, item) => {
    const rawField = typeof item?.field === "string" ? item.field : undefined;
    const message = typeof item?.message === "string" ? item.message : undefined;
    if (!rawField || !message) {
      return fieldErrors;
    }

    const normalizedField =
      rawField === "request_title"
        ? "title"
        : rawField === "brief_description"
          ? "description"
          : rawField === "primary_country_id"
            ? "country_id"
            : rawField === "content_type_id"
              ? "material_type_id"
              : rawField === "therapy_area_id"
                ? "therapeutic_area_id"
                : rawField === "in_market_date"
                  ? "required_by_date"
                  : rawField;

    fieldErrors[normalizedField] = message;
    return fieldErrors;
  }, {});
}
