import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useAuth } from "../components/AuthContext";
import { doPasswordReset } from "../firebase/auth";
import { loadStores, settingsRequest } from "../services/settings";
import type { Store } from "../services/settings";

export function SettingsPage() {
  const { user, updateDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [stores, setStores] = useState<Store[]>([]);
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);
  const [error, setError] = useState("");
  const [storeError, setStoreError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const isAdmin = user?.role === "admin";
  useEffect(() => { setDisplayName(user?.display_name || ""); }, [user?.display_name]);
  useEffect(() => {
    let cancelled = false;
    loadStores().then((data) => { if (!cancelled) { setStores(data.stores); setStoreError(""); } })
      .catch((err) => { if (!cancelled) setStoreError(err instanceof Error ? err.message : "Unable to load stores"); })
      .finally(() => { if (!cancelled) setLoadingStores(false); });
    return () => { cancelled = true; };
  }, [reload]);
  const perform = async (action: () => Promise<void>, success: string) => {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(success); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to save changes"); }
    finally { setBusy(false); }
  };
  const saveStore = async () => {
    await settingsRequest(editing ? `/api/stores/${editing}` : "/api/stores", {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: storeName, address }),
    });
    setShowForm(false); setEditing(null); setStoreName(""); setAddress("");
    setLoadingStores(true); setReload((value) => value + 1);
  };
  return <div className="space-y-6">
    <h1>Settings</h1>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {message && <p role="status">{message}</p>}
    <Tabs defaultValue="account" className="space-y-6">
      <TabsList><TabsTrigger value="account">Account</TabsTrigger><TabsTrigger value="stores">Stores</TabsTrigger><TabsTrigger value="notifications">Notifications</TabsTrigger><TabsTrigger value="data">Data</TabsTrigger></TabsList>
      <TabsContent value="account" className="space-y-6">
        <Card><CardHeader><CardTitle>Profile Information</CardTitle><CardDescription>Your signed-in account.</CardDescription></CardHeader><CardContent>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void perform(() => updateDisplayName(displayName.trim()), "Profile saved."); }}>
            <div><Label htmlFor="display-name">Display name</Label><Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={255} disabled={busy} /></div>
            <div><Label htmlFor="email">Email address</Label><Input id="email" type="email" value={user?.email || ""} readOnly /></div>
            <div><Label htmlFor="role">Role</Label><Input id="role" value={user?.role || ""} readOnly /></div>
            <div className="flex gap-2"><Button disabled={busy || !displayName.trim()} type="submit">{busy ? "Saving..." : "Save Changes"}</Button><Button variant="outline" type="button" disabled={busy} onClick={() => setDisplayName(user?.display_name || "")}>Cancel</Button></div>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Security</CardTitle><CardDescription>Reset your password using your account email.</CardDescription></CardHeader><CardContent><Button variant="outline" disabled={busy || !user?.email} onClick={() => void perform(() => doPasswordReset(user?.email || ""), "Password reset email sent.")}>Send password reset email</Button></CardContent></Card>
      </TabsContent>
      <TabsContent value="stores"><Card><CardHeader><CardTitle>Store Locations</CardTitle><CardDescription>Stores belonging to your company.</CardDescription></CardHeader><CardContent className="space-y-4">
        {storeError && <p role="alert" className="text-destructive">{storeError}</p>}
        {loadingStores ? <p>Loading stores...</p> : !stores.length && !storeError ? <p>No stores have been added.</p> : stores.map((store) => <div key={store.id} className="flex items-center justify-between border-b pb-4"><div><h3>{store.name}</h3><p className="text-muted-foreground">{store.address || "Address not provided"}</p><p>{store.location_count} inventory locations{!store.is_active && " · Inactive"}</p></div>{isAdmin && <Button variant="outline" disabled={busy} onClick={() => { setEditing(store.id); setStoreName(store.name); setAddress(store.address || ""); setShowForm(true); }}>Edit</Button>}</div>)}
        {isAdmin && !showForm && <Button onClick={() => { setEditing(null); setStoreName(""); setAddress(""); setShowForm(true); }}>Add Store</Button>}
        {isAdmin && showForm && <form className="space-y-4 border rounded-lg p-4" onSubmit={(event) => { event.preventDefault(); void perform(saveStore, "Store saved."); }}><h3>{editing ? "Edit Store" : "Add Store"}</h3><Label htmlFor="store-name">Store name</Label><Input id="store-name" value={storeName} onChange={(event) => setStoreName(event.target.value)} required maxLength={255} disabled={busy} /><Label htmlFor="store-address">Address</Label><Input id="store-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={1000} disabled={busy} /><div className="flex gap-2"><Button disabled={busy || !storeName.trim()} type="submit">Save Store</Button><Button variant="outline" type="button" disabled={busy} onClick={() => setShowForm(false)}>Cancel</Button></div></form>}
      </CardContent></Card></TabsContent>
      <TabsContent value="notifications"><Card><CardHeader><CardTitle>Notifications</CardTitle></CardHeader><CardContent>Notification preferences are not available yet.</CardContent></Card></TabsContent>
      <TabsContent value="data"><Card><CardHeader><CardTitle>Data Management</CardTitle></CardHeader><CardContent>Exports and retention settings are not available yet.</CardContent></Card></TabsContent>
    </Tabs>
  </div>;
}
