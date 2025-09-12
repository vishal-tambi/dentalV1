import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const Register = () => {
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    role: "patient",
    patientId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // handle input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name || e.target.id]: e.target.value });
  };

  // handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.firstname} ${formData.lastname}`,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          patientId: formData.role === "patient" ? formData.patientId : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
      } else {
        setSuccess("Registration successful! You can now log in.");
        setFormData({
          firstname: "",
          lastname: "",
          email: "",
          password: "",
          role: "patient",
          patientId: "",
        });
      }
    } catch (err) {
      console.log(err);
      setError("Server error, try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
      <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
        Create Your Account
      </h2>
      <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
        Fill in your details to get started.
      </p>

      <form className="my-8" onSubmit={handleSubmit}>
        {/* First + Last name */}
        <div className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
          <LabelInputContainer>
            <Label htmlFor="firstname">First name</Label>
            <Input
              id="firstname"
              value={formData.firstname}
              onChange={handleChange}
              placeholder="Tyler"
              type="text"
              required
            />
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="lastname">Last name</Label>
            <Input
              id="lastname"
              value={formData.lastname}
              onChange={handleChange}
              placeholder="Durden"
              type="text"
              required
            />
          </LabelInputContainer>
        </div>

        {/* Email */}
        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="projectmayhem@fc.com"
            type="email"
            required
          />
        </LabelInputContainer>

        {/* Password */}
        <LabelInputContainer className="mb-4">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            type="password"
            required
          />
        </LabelInputContainer>

        {/* Role dropdown */}
        <LabelInputContainer className="mb-4">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="input-field border rounded-md px-3 py-2 dark:bg-black dark:text-white"
          >
            <option value="patient">Patient</option>
            <option value="admin">Admin</option>
          </select>
        </LabelInputContainer>

        {/* PatientId only if role === patient */}
        {formData.role === "patient" && (
          <LabelInputContainer className="mb-6">
            <Label htmlFor="patientId">Patient ID</Label>
            <Input
              id="patientId"
              name="patientId"
              value={formData.patientId}
              onChange={handleChange}
              placeholder="e.g., PAT001"
              required
            />
          </LabelInputContainer>
        )}

        {/* Errors & Success */}
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        {success && <p className="text-green-500 text-sm mb-2">{success}</p>}

        {/* Submit button */}
        <button
          disabled={loading}
          className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-md dark:bg-zinc-800"
          type="submit"
        >
          {loading ? "Registering..." : "Sign up →"}
          <BottomGradient />
        </button>
      </form>
    </div>
  );
};

const BottomGradient = () => (
  <>
    <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
    <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
  </>
);

const LabelInputContainer = ({ children, className }) => (
  <div className={cn("flex w-full flex-col space-y-2", className)}>
    {children}
  </div>
);

export default Register;
