const constraintMessages: Record<string, string> = {
  isEmail: 'Enter a valid email address.',
  isString: 'This field must be text.',
  isEnum: 'Choose a valid option.',
  isMongoId: 'Choose a valid item from the list.',
  minLength: 'Use at least the minimum number of characters.',
  maxLength: 'This value is too long.',
  isDateString: 'Enter a valid date.',
  isNotEmpty: 'This field is required.',
};

const knownMessages: Record<string, string> = {
  'Invalid credentials': 'The email or password you entered is incorrect.',
  'Refresh token missing': 'Your session has expired. Please sign in again.',
  'Invalid refresh token': 'Your session has expired. Please sign in again.',
  'Insufficient permissions': 'You do not have permission to perform this action.',
  'Cannot assign this role': 'You can only assign roles that your account is allowed to manage.',
  'Email already in use': 'That email address is already linked to another account.',
  'Username already in use': 'That username is already taken. Try another one.',
  'Tag already exists': 'A tag with this name already exists.',
  'Cannot delete tag with assigned blogs': 'Remove this tag from all blogs before deleting it.',
  'Image file is required': 'Choose an image to upload.',
  'Unsupported image type': 'Upload a JPG, PNG, or WebP image.',
  'Image upload failed': 'We could not upload the image. Please try again.',
  'File upload failed': 'We could not upload the file. Please try again.',
  'Unsupported file type. Use JPG, PNG, WebP, or PDF.':
    'Use a JPG, PNG, WebP image, or a PDF file.',
  'Could not load files from Cloudinary. Check API credentials and folder settings.':
    'We could not load your files. Check Cloudinary settings and try again.',
  'Internal server error': 'Something went wrong on our side. Please try again shortly.',
};

export function humanizeFieldName(field: string) {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function humanizeKnownMessage(message: string) {
  if (knownMessages[message]) {
    return knownMessages[message];
  }

  if (message.startsWith('Cannot transition from')) {
    return 'This action is not allowed for the blog in its current status.';
  }

  if (message.includes('should not exist')) {
    return 'One or more fields are not supported. Remove any extra values and try again.';
  }

  if (message.includes('must be a valid email')) {
    return 'Enter a valid email address.';
  }

  if (message.includes('must be longer than or equal to')) {
    return 'Use a longer value for this field.';
  }

  return message;
}

export function humanizeValidationMessage(message: string, field: string) {
  const normalized = message.toLowerCase();

  for (const [constraint, friendly] of Object.entries(constraintMessages)) {
    if (normalized.includes(constraint.toLowerCase())) {
      return friendly;
    }
  }

  if (normalized.includes(field.toLowerCase())) {
    return humanizeKnownMessage(message);
  }

  return humanizeKnownMessage(message);
}

export function defaultMessageForStatus(status: number) {
  switch (status) {
    case 400:
      return 'Please check the form and try again.';
    case 401:
      return 'Please sign in to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'This action conflicts with existing data.';
    case 422:
      return 'This action is not allowed right now.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
