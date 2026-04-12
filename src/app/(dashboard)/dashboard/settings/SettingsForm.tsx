'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Label,
} from '@/components/ui';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface SettingsFormProps {
  organization: Organization;
  canEdit: boolean;
}

/**
 * Form for updating organization settings.
 */
export function SettingsForm({ organization, canEdit }: SettingsFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [logoUrl, setLogoUrl] = useState(organization.logo_url);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      const supabase = createClient();

      // Create unique filename
      const ext = file.name.split('.').pop();
      const filename = `${organization.id}/logo-${Date.now()}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(filename, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(filename);

      // Update organization with new logo URL
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: publicUrl })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      setSuccess('Logo uploaded successfully');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('organizations')
        .update({ name, slug })
        .eq('id', organization.id);

      if (error) throw error;

      setSuccess('Settings saved successfully');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveLogo() {
    if (!canEdit) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('organizations')
        .update({ logo_url: null })
        .eq('id', organization.id);

      if (error) throw error;

      setLogoUrl(null);
      setSuccess('Logo removed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove logo');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);

    try {
      const supabase = createClient();

      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Unable to verify user');
      }

      // Try to sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo Card */}
      <Card>
        <CardHeader>
          <CardTitle>Company Logo</CardTitle>
          <CardDescription>
            This logo will appear in the navigation sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            {/* Logo preview */}
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-border bg-hover">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={name}
                  width={80}
                  height={80}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-2xl font-bold text-muted">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Upload controls */}
            {canEdit && (
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploadingLogo}
                >
                  {logoUrl ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemoveLogo}
                    disabled={loading}
                  >
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted">
                  PNG, JPG, or GIF. Max 2MB.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Organization Details Card */}
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Update your organization&apos;s name and URL slug.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-error-light p-3 text-sm text-error">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-success-light p-3 text-sm text-success">
                {success}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" required>Organization Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Delivery Co"
                required
                disabled={!canEdit}
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug" required>URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="acme-delivery-co"
                required
                disabled={!canEdit}
                pattern="[a-z0-9-]+"
                title="Only lowercase letters, numbers, and hyphens"
              />
              <p className="text-xs text-muted">
                Only lowercase letters, numbers, and hyphens.
              </p>
            </div>
          </CardContent>

          {canEdit && (
            <CardFooter>
              <Button type="submit" loading={loading}>
                Save Changes
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {/* Change Password Card */}
      <Card>
        <form onSubmit={handlePasswordChange}>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your account password.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {passwordError && (
              <div className="rounded-md bg-error-light p-3 text-sm text-error">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="rounded-md bg-success-light p-3 text-sm text-success">
                {passwordSuccess}
              </div>
            )}

            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" required>Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
              />
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" required>New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" required>Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                minLength={6}
                required
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" loading={changingPassword}>
              Change Password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
