import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else setMessage("✅ Password updated successfully! You can log in again.");
  };

  return (
    <div className="reset-page">
      <h2>Reset your password</h2>
      <input
        type="password"
        placeholder="Enter your new password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleReset}>Update Password</button>
      <p>{message}</p>
    </div>
  );
}
