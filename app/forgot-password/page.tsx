import Image from "next/image"
import Link from "next/link"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center">
        <div className="bg-white rounded-2xl shadow-2xl flex w-2/3 max-w-4xl">
          <div className="w-3/5 p-5">
            <div className="text-left font-bold">
              <span className="text-green-500">Axle</span>
            </div>
            <div className="py-10">
              <h2 className="text-3xl font-bold text-green-500 mb-2">Forgot Password</h2>
              <div className="border-2 w-10 border-green-500 inline-block mb-2"></div>
              <div className="flex justify-center my-2">
                <Image src="/images/forgot.svg" alt="Forgot Password" width={300} height={200} />
              </div>
              <p className="text-gray-500 mb-2">
                Enter your email address and we will send you a link to reset your password.
              </p>
              <div className="flex flex-col items-center">
                <input
                  type="email"
                  placeholder="Email Address"
                  className="border w-full rounded-md bg-gray-50 py-3 px-3 text-gray-700 mt-2 focus:outline-none"
                />
                <button className="block w-full bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-md mt-4 transition duration-300">
                  Reset Password
                </button>
              </div>
            </div>
          </div>
          <div className="w-2/5 bg-green-500 text-white rounded-tr-2xl rounded-br-2xl py-36 px-12">
            <h2 className="text-3xl font-bold mb-2">Hello, Friend!</h2>
            <div className="border-2 w-10 border-white inline-block mb-2"></div>
            <p className="mb-10">Enter your personal details and start journey with us</p>
            <Link
              href="/register"
              className="border-2 border-white rounded-md px-12 py-2 inline-block font-semibold hover:bg-white hover:text-green-500 transition duration-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
        <div className="w-2/3 text-gray-500 mt-10">
          <Link href="/" className="underline">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  )
}
