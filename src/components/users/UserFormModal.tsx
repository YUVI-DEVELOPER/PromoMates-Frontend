import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getCountries as getSupportedPhoneCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parseIncompletePhoneNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js";

import type { Role, User, UserCreatePayload, UserUpdatePayload } from "../../types/user";
import type { UserGroupOption } from "../../types/userGroup";
import type { Country, Region, SubTherapyArea, TherapeuticArea } from "../../types/masterData";
import { getRoleLabel } from "../../utils/roles";
import { useRedisFormDraft } from "../../hooks/useRedisFormDraft";
import { FormDraftNotice } from "../ui/FormDraftNotice";


type UserFormValues = {
  full_name: string;
  email: string;
  phone_country_code: string;
  phone_number: string;
  manager_id: string;
  designation: string;
  department: string;
  password: string;
  is_active: boolean;
  is_superuser: boolean;
  role_ids: number[];
  group_ids: number[];
  region_ids: number[];
  country_ids: number[];
  therapy_area_ids: number[];
  sub_therapy_area_ids: number[];
};


type FormErrors = Partial<Record<keyof UserFormValues, string>>;


type PhoneCountryOption = {
  callingCode: string;
  countryCode: CountryCode;
  countryName: string;
};


type UserFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  roles: Role[];
  groups: UserGroupOption[];
  users: User[];
  regions: Region[];
  countries: Country[];
  therapeuticAreas: TherapeuticArea[];
  subTherapyAreas: SubTherapyArea[];
  user: User | null;
  canManageSuperuser: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (payload: UserCreatePayload | UserUpdatePayload) => Promise<void>;
};


const COUNTRY_CODE_ALIASES: Record<string, CountryCode> = {
  UK: "GB",
};


const CONTACT_PHONE_LENGTHS_BY_COUNTRY: Partial<Record<CountryCode, number[]>> = {
  IN: [10],
  US: [10],
  CA: [10],
  GB: [10],
};


const NATIONAL_TRUNK_PREFIX_BY_COUNTRY: Partial<Record<CountryCode, string>> = {
  IN: "0",
  GB: "0",
};


function getDigits(value: string): string {
  return value.replace(/\D/g, "");
}


function getSupportedCountryCode(countryCode: string): CountryCode | null {
  const normalizedCode = countryCode.trim().toUpperCase();
  const aliasedCode = COUNTRY_CODE_ALIASES[normalizedCode] ?? normalizedCode;

  return isSupportedCountry(aliasedCode) ? aliasedCode : null;
}


function getPhoneCountryOptions(countries: Array<Pick<Country, "code" | "name">>): PhoneCountryOption[] {
  const supportedCountryCodes = getSupportedPhoneCountries();
  const displayNames = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;
  const appCountryNames = new Map<CountryCode, string>();
  const optionByCountryCode = new Map<CountryCode, PhoneCountryOption>();

  countries.forEach((country) => {
    const supportedCountryCode = getSupportedCountryCode(country.code);

    if (!supportedCountryCode) {
      return;
    }

    appCountryNames.set(supportedCountryCode, country.name);
  });

  supportedCountryCodes.forEach((countryCode) => {
    if (optionByCountryCode.has(countryCode)) {
      return;
    }

    const countryName = appCountryNames.get(countryCode)
      ?? displayNames?.of(countryCode)
      ?? countryCode;

    optionByCountryCode.set(countryCode, {
      callingCode: getCountryCallingCode(countryCode),
      countryCode,
      countryName,
    });
  });

  return [...optionByCountryCode.values()].sort((first, second) =>
    first.countryName.localeCompare(second.countryName),
  );
}


function getPhoneCountryLabel(option: PhoneCountryOption): string {
  return `${option.countryCode} (+${option.callingCode}) ${option.countryName}`;
}


function getPhoneMaxLength(option: PhoneCountryOption | undefined): number {
  if (!option) {
    return 15;
  }

  const expectedLengths = CONTACT_PHONE_LENGTHS_BY_COUNTRY[option.countryCode];

  if (expectedLengths && expectedLengths.length > 0) {
    return Math.max(...expectedLengths);
  }

  return 15 - option.callingCode.length;
}


function describePhoneLength(option: PhoneCountryOption): string {
  const expectedLengths = CONTACT_PHONE_LENGTHS_BY_COUNTRY[option.countryCode];

  if (!expectedLengths || expectedLengths.length === 0) {
    return "phone";
  }

  if (expectedLengths.length === 1) {
    return `${expectedLengths[0]}-digit`;
  }

  return `${Math.min(...expectedLengths)}-${Math.max(...expectedLengths)} digit`;
}


function getNationalPhoneDigits(value: string, option: PhoneCountryOption | undefined): string {
  const incompletePhoneNumber = parseIncompletePhoneNumber(value);

  if (!option) {
    return getDigits(incompletePhoneNumber);
  }

  if (incompletePhoneNumber.startsWith("+")) {
    const parsedPhoneNumber = parsePhoneNumberFromString(incompletePhoneNumber);

    if (parsedPhoneNumber?.countryCallingCode === option.callingCode) {
      return getDigits(parsedPhoneNumber.nationalNumber);
    }
  }

  let digits = getDigits(incompletePhoneNumber);
  const internationalPrefix = `00${option.callingCode}`;
  const maxLength = getPhoneMaxLength(option);
  const trunkPrefix = NATIONAL_TRUNK_PREFIX_BY_COUNTRY[option.countryCode];

  if (digits.startsWith(internationalPrefix)) {
    digits = digits.slice(internationalPrefix.length);
  } else if (trunkPrefix && digits.length > maxLength && digits.startsWith(trunkPrefix)) {
    digits = digits.slice(trunkPrefix.length);
  } else if (digits.length > maxLength && digits.startsWith(option.callingCode)) {
    digits = digits.slice(option.callingCode.length);
  }

  return digits;
}


function normalizePhoneInput(value: string, option: PhoneCountryOption | undefined): string {
  return getNationalPhoneDigits(value, option).slice(0, getPhoneMaxLength(option));
}


function splitStoredPhoneNumber(
  phoneNumber: string | null | undefined,
  options: PhoneCountryOption[],
): Pick<UserFormValues, "phone_country_code" | "phone_number"> {
  const normalizedPhoneNumber = phoneNumber?.trim();

  if (!normalizedPhoneNumber) {
    return {
      phone_country_code: "",
      phone_number: "",
    };
  }

  const parsedPhoneNumber = parsePhoneNumberFromString(normalizedPhoneNumber);
  const matchingOption = parsedPhoneNumber
    ? options.find((option) => option.countryCode === parsedPhoneNumber.country)
    : undefined;

  if (matchingOption && parsedPhoneNumber) {
    return {
      phone_country_code: matchingOption.countryCode,
      phone_number: normalizePhoneInput(parsedPhoneNumber.nationalNumber, matchingOption),
    };
  }

  const nationalDigits = getDigits(normalizedPhoneNumber);
  const longestMatchingOption = [...options]
    .sort((first, second) => second.callingCode.length - first.callingCode.length)
    .find((option) => nationalDigits.startsWith(option.callingCode));

  if (longestMatchingOption && nationalDigits.length > getPhoneMaxLength(longestMatchingOption)) {
    return {
      phone_country_code: longestMatchingOption.countryCode,
      phone_number: normalizePhoneInput(nationalDigits, longestMatchingOption),
    };
  }

  return {
    phone_country_code: "",
    phone_number: nationalDigits.slice(0, 15),
  };
}


function getPhoneValidationError(
  values: UserFormValues,
  option: PhoneCountryOption | undefined,
): string | undefined {
  const phoneDigits = getDigits(values.phone_number);

  if (!phoneDigits) {
    return undefined;
  }

  if (!values.phone_country_code || !option) {
    return "Select a country code before entering the phone number.";
  }

  const expectedLengths = CONTACT_PHONE_LENGTHS_BY_COUNTRY[option.countryCode];

  if (expectedLengths && !expectedLengths.includes(phoneDigits.length)) {
    return `Enter a ${describePhoneLength(option)} number for ${option.countryName}.`;
  }

  const lengthValidation = validatePhoneNumberLength(phoneDigits, option.countryCode);

  if (lengthValidation === "TOO_SHORT") {
    return `Phone number is too short for ${option.countryName}.`;
  }

  if (lengthValidation === "TOO_LONG") {
    return `Phone number is too long for ${option.countryName}.`;
  }

  if (lengthValidation === "INVALID_LENGTH") {
    return `Phone number length is not valid for ${option.countryName}.`;
  }

  if (lengthValidation === "INVALID_COUNTRY" || lengthValidation === "NOT_A_NUMBER") {
    return "Enter a valid phone number.";
  }

  return undefined;
}


function formatPhoneNumberForPayload(
  phoneNumber: string,
  option: PhoneCountryOption | undefined,
): string | null {
  const phoneDigits = getDigits(phoneNumber);

  if (!phoneDigits || !option) {
    return null;
  }

  const parsedPhoneNumber = parsePhoneNumberFromString(phoneDigits, option.countryCode);

  return parsedPhoneNumber?.formatInternational() ?? `+${option.callingCode} ${phoneDigits}`;
}


function getInitialValues(
  mode: "create" | "edit",
  user: User | null,
  countries: Country[],
): UserFormValues {
  const phoneCountryOptions = getPhoneCountryOptions(countries);
  const phoneValues = splitStoredPhoneNumber(user?.phone_number, phoneCountryOptions);

  if (mode === "edit" && user) {
    return {
      full_name: user.full_name,
      email: user.email,
      phone_country_code: phoneValues.phone_country_code,
      phone_number: phoneValues.phone_number,
      manager_id: user.manager_id ? String(user.manager_id) : "",
      designation: user.designation ?? "",
      department: user.department ?? "",
      password: "",
      is_active: user.is_active,
      is_superuser: user.is_superuser,
      role_ids: user.roles.map((role) => role.id),
      group_ids: user.groups.map((group) => group.id),
      region_ids: user.region_ids ?? [],
      country_ids: user.country_ids ?? [],
      therapy_area_ids: user.therapy_area_ids ?? [],
      sub_therapy_area_ids: user.sub_therapy_area_ids ?? [],
    };
  }

  return {
    full_name: "",
    email: "",
    phone_country_code: "",
    phone_number: "",
    manager_id: "",
    designation: "",
    department: "",
    password: "",
    is_active: true,
    is_superuser: false,
    role_ids: [],
    group_ids: [],
    region_ids: [],
    country_ids: [],
    therapy_area_ids: [],
    sub_therapy_area_ids: [],
  };
}


function stringFromDraftValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}


function booleanFromDraftValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}


function numberListFromDraftValue(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}


function getUserDraftPayload(values: UserFormValues): UserFormValues {
  return {
    ...values,
    password: "",
  };
}


function restoreUserDraftValues(
  payload: Partial<UserFormValues>,
  fallback: UserFormValues,
): UserFormValues {
  return {
    full_name: stringFromDraftValue(payload.full_name, fallback.full_name),
    email: stringFromDraftValue(payload.email, fallback.email),
    phone_country_code: stringFromDraftValue(payload.phone_country_code, fallback.phone_country_code),
    phone_number: stringFromDraftValue(payload.phone_number, fallback.phone_number),
    manager_id: stringFromDraftValue(payload.manager_id, fallback.manager_id),
    designation: stringFromDraftValue(payload.designation, fallback.designation),
    department: stringFromDraftValue(payload.department, fallback.department),
    password: "",
    is_active: booleanFromDraftValue(payload.is_active, fallback.is_active),
    is_superuser: booleanFromDraftValue(payload.is_superuser, fallback.is_superuser),
    role_ids: numberListFromDraftValue(payload.role_ids, fallback.role_ids),
    group_ids: numberListFromDraftValue(payload.group_ids, fallback.group_ids),
    region_ids: numberListFromDraftValue(payload.region_ids, fallback.region_ids),
    country_ids: numberListFromDraftValue(payload.country_ids, fallback.country_ids),
    therapy_area_ids: numberListFromDraftValue(payload.therapy_area_ids, fallback.therapy_area_ids),
    sub_therapy_area_ids: numberListFromDraftValue(payload.sub_therapy_area_ids, fallback.sub_therapy_area_ids),
  };
}


export function UserFormModal({
  isOpen,
  mode,
  roles,
  groups,
  users,
  regions,
  countries,
  therapeuticAreas,
  subTherapyAreas,
  user,
  canManageSuperuser,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const [values, setValues] = useState<UserFormValues>(() => getInitialValues(mode, user, countries));
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [phoneCountrySearch, setPhoneCountrySearch] = useState("");

  const title = mode === "create" ? "Create User" : "Edit User";
  const submitLabel = mode === "create" ? "Create user" : "Save changes";
  const draftKey = isOpen
    ? mode === "create"
      ? "user:create"
      : user
        ? `user:edit:${user.id}`
        : null
    : null;
  const {
    draftState,
    draftUpdatedAt,
    draftExpiresAt,
    draftError,
    loadDraft,
    saveDraft,
    clearDraft,
    resetDraftState,
  } = useRedisFormDraft<UserFormValues>(draftKey);

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      const initialValues = getInitialValues(mode, user, countries);
      setValues(initialValues);
      setErrors({});
      setShowPassword(false);
      setPhoneCountrySearch("");

      void loadDraft().then((draft) => {
        if (isMounted && draft) {
          setValues(restoreUserDraftValues(draft.payload, initialValues));
        }
      });
    } else {
      resetDraftState();
    }

    return () => {
      isMounted = false;
    };
  }, [countries, isOpen, loadDraft, mode, resetDraftState, user]);

  const sortedRoles = useMemo(
    () =>
      [...roles].sort((first, second) =>
        getRoleLabel(first.name).localeCompare(getRoleLabel(second.name)),
      ),
    [roles],
  );
  const sortedGroups = useMemo(
    () => {
      const groupMap = new Map(groups.map((group) => [group.id, group]));

      (user?.groups ?? []).forEach((group) => {
        if (!groupMap.has(group.id)) {
          groupMap.set(group.id, group);
        }
      });

      return [...groupMap.values()].sort((first, second) => first.name.localeCompare(second.name));
    },
    [groups, user?.groups],
  );
  const managerOptions = useMemo(
    () =>
      users
        .filter((candidate) => candidate.is_active && candidate.id !== user?.id)
        .sort((first, second) => first.full_name.localeCompare(second.full_name)),
    [user?.id, users],
  );
  const phoneCountryOptions = useMemo(() => getPhoneCountryOptions(countries), [countries]);
  const selectedPhoneCountryOption = useMemo(
    () =>
      phoneCountryOptions.find(
        (option) => option.countryCode === values.phone_country_code,
      ),
    [phoneCountryOptions, values.phone_country_code],
  );
  const phoneFieldError = errors.phone_country_code ?? errors.phone_number;
  const phoneCountryListId = "phone-country-options";

  useEffect(() => {
    if (selectedPhoneCountryOption) {
      setPhoneCountrySearch(getPhoneCountryLabel(selectedPhoneCountryOption));
      return;
    }

    setPhoneCountrySearch("");
  }, [selectedPhoneCountryOption]);

  function updateValue<FieldName extends keyof UserFormValues>(
    fieldName: FieldName,
    value: UserFormValues[FieldName],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [fieldName]: value,
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [fieldName]: undefined,
    }));
  }

  function updatePhoneCountryCode(countryCode: string) {
    const nextPhoneCountryOption = phoneCountryOptions.find(
      (option) => option.countryCode === countryCode,
    );

    setValues((currentValues) => ({
      ...currentValues,
      phone_country_code: countryCode,
      phone_number: normalizePhoneInput(currentValues.phone_number, nextPhoneCountryOption),
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      phone_country_code: undefined,
      phone_number: undefined,
    }));
  }

  function findExactPhoneCountryOption(query: string): PhoneCountryOption | undefined {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return undefined;
    }

    const digitsOnlyQuery = normalizedQuery.replace(/[^\d]/g, "");
    const exactCodeMatch = phoneCountryOptions.find(
      (option) => option.countryCode.toLowerCase() === normalizedQuery,
    );

    if (exactCodeMatch) {
      return exactCodeMatch;
    }

    const exactCallingCodeMatch = phoneCountryOptions.find(
      (option) => option.callingCode === digitsOnlyQuery,
    );

    if (exactCallingCodeMatch) {
      return exactCallingCodeMatch;
    }

    const exactLabelMatch = phoneCountryOptions.find(
      (option) => getPhoneCountryLabel(option).toLowerCase() === normalizedQuery,
    );

    if (exactLabelMatch) {
      return exactLabelMatch;
    }

    return phoneCountryOptions.find(
      (option) => getPhoneCountryLabel(option).toLowerCase() === normalizedQuery,
    );
  }

  function findPhoneCountryOption(query: string): PhoneCountryOption | undefined {
    const exactMatch = findExactPhoneCountryOption(query);

    if (exactMatch) {
      return exactMatch;
    }

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return undefined;
    }

    return phoneCountryOptions.find((option) => {
      const countryCode = option.countryCode.toLowerCase();
      const countryName = option.countryName.toLowerCase();
      const callingCode = `+${option.callingCode}`;

      return (
        countryCode.startsWith(normalizedQuery)
        || countryName.startsWith(normalizedQuery)
        || callingCode.startsWith(normalizedQuery)
      );
    });
  }

  function handlePhoneCountrySearchChange(nextValue: string) {
    setPhoneCountrySearch(nextValue);
    setErrors((currentErrors) => ({
      ...currentErrors,
      phone_country_code: undefined,
      phone_number: undefined,
    }));

    if (!nextValue.trim()) {
      updatePhoneCountryCode("");
      return;
    }

    const matchedOption = findExactPhoneCountryOption(nextValue);

    if (matchedOption) {
      updatePhoneCountryCode(matchedOption.countryCode);
    }
  }

  function commitPhoneCountrySearch() {
    const trimmedValue = phoneCountrySearch.trim();

    if (!trimmedValue) {
      updatePhoneCountryCode("");
      setPhoneCountrySearch("");
      return;
    }

    const matchedOption = findPhoneCountryOption(trimmedValue);

    if (matchedOption) {
      updatePhoneCountryCode(matchedOption.countryCode);
      setPhoneCountrySearch(getPhoneCountryLabel(matchedOption));
      return;
    }

    setErrors((currentErrors) => ({
      ...currentErrors,
      phone_country_code: "Choose a valid country code.",
    }));
  }

  function updatePhoneNumber(phoneNumber: string) {
    updateValue("phone_number", normalizePhoneInput(phoneNumber, selectedPhoneCountryOption));
  }

  function toggleRole(roleId: number) {
    const nextRoleIds = values.role_ids.includes(roleId)
      ? values.role_ids.filter((id) => id !== roleId)
      : [...values.role_ids, roleId];

    updateValue("role_ids", nextRoleIds);
  }

  function toggleGroup(groupId: number) {
    const nextGroupIds = values.group_ids.includes(groupId)
      ? values.group_ids.filter((id) => id !== groupId)
      : [...values.group_ids, groupId];

    updateValue("group_ids", nextGroupIds);
  }

  function toggleIdList(fieldName: keyof Pick<
    UserFormValues,
    "region_ids" | "country_ids" | "therapy_area_ids" | "sub_therapy_area_ids"
  >, itemId: number) {
    const currentIds = values[fieldName];
    const nextIds = currentIds.includes(itemId)
      ? currentIds.filter((id) => id !== itemId)
      : [...currentIds, itemId];

    updateValue(fieldName, nextIds);
  }

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};

    if (!values.full_name.trim()) {
      nextErrors.full_name = "Full name is required.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "Email is required.";
    }

    const phoneValidationError = getPhoneValidationError(values, selectedPhoneCountryOption);

    if (phoneValidationError) {
      if (!values.phone_country_code) {
        nextErrors.phone_country_code = phoneValidationError;
      } else {
        nextErrors.phone_number = phoneValidationError;
      }
    }

    if (mode === "create" && !values.password) {
      nextErrors.password = "Password is required.";
    }

    if (mode === "create" && values.password && values.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (values.role_ids.length === 0 && !values.is_superuser) {
      nextErrors.role_ids = "Select at least one role.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const basePayload = {
      full_name: values.full_name.trim(),
      email: values.email.trim(),
      phone_number: formatPhoneNumberForPayload(
        values.phone_number,
        selectedPhoneCountryOption,
      ),
      manager_id: values.manager_id ? Number(values.manager_id) : null,
      designation: values.designation.trim() || null,
      department: values.department.trim() || null,
      is_active: values.is_active,
      is_superuser: values.is_superuser,
      role_ids: values.role_ids,
      group_ids: values.group_ids,
      user_group_ids: values.group_ids,
      region_ids: values.region_ids,
      country_ids: values.country_ids,
      therapy_area_ids: values.therapy_area_ids,
      sub_therapy_area_ids: values.sub_therapy_area_ids,
    };

    try {
      if (mode === "create") {
        await onSubmit({
          ...basePayload,
          password: values.password,
        });
        await clearDraft();
        return;
      }

      await onSubmit(basePayload);
      await clearDraft();
    } catch {
      return;
    }
  }

  async function handleSaveDraft() {
    await saveDraft(getUserDraftPayload(values));
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        </div>

        <form className="space-y-5 px-6 py-5" autoComplete="off" onSubmit={handleSubmit}>
          {submitError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {submitError}
            </div>
          )}

          <FormDraftNotice
            state={draftState}
            updatedAt={draftUpdatedAt}
            expiresAt={draftExpiresAt}
            error={draftError}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="full_name">
                Full name
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                  ID
                </span>
                <input
                  id="full_name"
                  name="new_user_full_name"
                  autoComplete="off"
                  value={values.full_name}
                  onChange={(event) => updateValue("full_name", event.target.value)}
                  placeholder="Enter user full name"
                  className="w-full rounded-md border border-slate-300 px-11 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              {errors.full_name && (
                <p className="mt-1 text-xs font-medium text-rose-700">{errors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                Email
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                  @
                </span>
                <input
                  id="email"
                  name="new_user_email"
                  type="email"
                  autoComplete="off"
                  value={values.email}
                  onChange={(event) => updateValue("email", event.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-md border border-slate-300 px-9 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs font-medium text-rose-700">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="phone_number">
                Phone number
              </label>
              <div className="mt-2 flex">
                <div className="w-48">
                  <input
                    aria-label="Phone country code"
                    autoComplete="off"
                    list={phoneCountryListId}
                    value={phoneCountrySearch}
                    onBlur={commitPhoneCountrySearch}
                    onChange={(event) => handlePhoneCountrySearchChange(event.target.value)}
                    placeholder="Type IN, +91"
                    className="h-10 w-full rounded-l-md border border-r-0 border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                  <datalist id={phoneCountryListId}>
                    {phoneCountryOptions.map((option) => (
                      <option key={option.countryCode} value={getPhoneCountryLabel(option)} />
                    ))}
                  </datalist>
                </div>
                <input
                  id="phone_number"
                  name="new_user_phone_number"
                  type="tel"
                  autoComplete="tel-national"
                  disabled={!selectedPhoneCountryOption}
                  inputMode="numeric"
                  maxLength={getPhoneMaxLength(selectedPhoneCountryOption)}
                  pattern="[0-9]*"
                  value={values.phone_number}
                  onChange={(event) => updatePhoneNumber(event.target.value)}
                  placeholder={
                    selectedPhoneCountryOption
                      ? `Optional ${describePhoneLength(selectedPhoneCountryOption)} number`
                      : "Select code first"
                  }
                  className="h-10 min-w-0 flex-1 rounded-r-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
              {phoneFieldError && (
                <p className="mt-1 text-xs font-medium text-rose-700">{phoneFieldError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="designation">
                Designation
              </label>
              <input
                id="designation"
                name="new_user_designation"
                autoComplete="off"
                value={values.designation}
                onChange={(event) => updateValue("designation", event.target.value)}
                placeholder="Optional designation"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="department">
                Department
              </label>
              <input
                id="department"
                name="new_user_department"
                autoComplete="off"
                value={values.department}
                onChange={(event) => updateValue("department", event.target.value)}
                placeholder="Optional department"
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="manager_id">
                Manager
              </label>
              <select
                id="manager_id"
                value={values.manager_id}
                onChange={(event) => updateValue("manager_id", event.target.value)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">No manager</option>
                {managerOptions.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mode === "create" && (
            <div>
              <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                Password
              </label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                  **
                </span>
                <input
                  id="password"
                  name="new_user_password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={values.password}
                  onChange={(event) => updateValue("password", event.target.value)}
                  placeholder="Set a temporary password"
                  className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-2 flex w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs font-medium text-rose-700">{errors.password}</p>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(event) => updateValue("is_active", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
              />
              Active
            </label>

            {canManageSuperuser && (
              <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={values.is_superuser}
                  onChange={(event) => updateValue("is_superuser", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                />
                Superuser
              </label>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-4">
              <label className="block text-sm font-medium text-slate-700">Roles</label>
              {errors.role_ids && (
                <p className="text-xs font-medium text-rose-700">{errors.role_ids}</p>
              )}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {sortedRoles.length === 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800 sm:col-span-2">
                  No roles are available. Create roles from Admin &gt; Roles.
                </div>
              )}

              {sortedRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-3 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={values.role_ids.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                  />
                  <span>
                    <span className="block font-medium text-slate-900">
                      {getRoleLabel(role.name)}
                      <span className="ml-2 text-xs font-semibold text-slate-500">{role.code}</span>
                    </span>
                    {role.description && (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {role.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">User Groups</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {sortedGroups.length === 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 sm:col-span-2">
                  No active user groups are configured.
                </div>
              )}

              {sortedGroups.map((group) => (
                <label
                  key={group.id}
                  className={[
                    "flex items-start gap-3 rounded-md border px-3 py-3 text-sm",
                    group.is_active
                      ? "border-slate-200 text-slate-700"
                      : "border-amber-200 bg-amber-50/50 text-slate-700",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={values.group_ids.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                    disabled={!group.is_active && !values.group_ids.includes(group.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                  />
                  <span>
                    <span className="block font-medium text-slate-900">
                      {group.name}
                      <span className="ml-2 text-xs font-semibold text-slate-500">{group.code}</span>
                      {!group.is_active && (
                        <span className="ml-2 text-xs font-semibold uppercase text-amber-700">
                          Inactive
                        </span>
                      )}
                    </span>
                    {group.group_type && (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {group.group_type}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <OptionCheckboxGrid
              label="Region Scope"
              emptyLabel="No active regions are configured."
              options={regions}
              selectedIds={values.region_ids}
              getLabel={(region) => region.name}
              onToggle={(id) => toggleIdList("region_ids", id)}
            />
            <OptionCheckboxGrid
              label="Country Scope"
              emptyLabel="No active countries are configured."
              options={countries}
              selectedIds={values.country_ids}
              getLabel={(country) => country.name}
              onToggle={(id) => toggleIdList("country_ids", id)}
            />
            <OptionCheckboxGrid
              label="Therapy Area Scope"
              emptyLabel="No active therapy areas are configured."
              options={therapeuticAreas}
              selectedIds={values.therapy_area_ids}
              getLabel={(area) => area.name}
              onToggle={(id) => toggleIdList("therapy_area_ids", id)}
            />
            <OptionCheckboxGrid
              label="Sub-Therapy Scope"
              emptyLabel="No active sub-therapy areas are configured."
              options={subTherapyAreas}
              selectedIds={values.sub_therapy_area_ids}
              getLabel={(area) => area.name}
              onToggle={(id) => toggleIdList("sub_therapy_area_ids", id)}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              disabled={isSubmitting || draftState === "saving"}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {draftState === "saving" ? "Saving draft..." : "Save Draft"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


type ScopeOption = {
  id: number;
  name?: string;
  code?: string;
};


type OptionCheckboxGridProps<T extends ScopeOption> = {
  label: string;
  emptyLabel: string;
  options: T[];
  selectedIds: number[];
  getLabel: (option: T) => string;
  onToggle: (id: number) => void;
};


function OptionCheckboxGrid<T extends ScopeOption>({
  label,
  emptyLabel,
  options,
  selectedIds,
  getLabel,
  onToggle,
}: OptionCheckboxGridProps<T>) {
  const sortedOptions = useMemo(
    () => [...options].sort((first, second) => getLabel(first).localeCompare(getLabel(second))),
    [getLabel, options],
  );

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
        {sortedOptions.length === 0 ? (
          <p className="px-2 py-2 text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          <div className="grid gap-2">
            {sortedOptions.map((option) => (
              <label
                key={option.id}
                className="flex items-start gap-3 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(option.id)}
                  onChange={() => onToggle(option.id)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                />
                <span>
                  <span className="font-medium text-slate-900">{getLabel(option)}</span>
                  {option.code && <span className="ml-2 text-xs font-semibold text-slate-500">{option.code}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}


function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M3 3l18 18" />
      <path d="M10.7 5.2A10.8 10.8 0 0 1 12 5c6 0 9.5 7 9.5 7a16.4 16.4 0 0 1-3.1 4.1" />
      <path d="M6.6 6.7A16 16 0 0 0 2.5 12s3.5 7 9.5 7a10 10 0 0 0 4.2-.9" />
      <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
    </svg>
  );
}
