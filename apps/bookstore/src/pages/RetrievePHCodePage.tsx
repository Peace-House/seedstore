import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Copy, Check, ChevronLeft } from 'lucide-react'

import Logo from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { retrievePHCode } from '@/services/user'

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card'

const RetrievePHCodePage = () => {
    const navigate = useNavigate()
    const { toast } = useToast()

    const [retrieveMethod, setRetrieveMethod] = useState<
        'phone' | 'email' | 'dob' | null
    >(null)

    const [surname, setSurname] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [email, setEmail] = useState('')
    const [birthDay, setBirthDay] = useState('')
    const [birthMonth, setBirthMonth] = useState('')
    const [birthYear, setBirthYear] = useState('')

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [retrievedPhCode, setRetrievedPhCode] = useState('')
    const [retrieveSource, setRetrieveSource] = useState<
        'legacy' | 'signup' | null
    >(null)
    const [isCopied, setIsCopied] = useState(false)
    const [step, setStep] = useState<'method' | 'form' | 'result'>('method')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const payload: any = { surname }

            if (retrieveMethod === 'phone') payload.phoneNumber = phoneNumber
            if (retrieveMethod === 'email') payload.email = email
            if (retrieveMethod === 'dob') {
                payload.day = birthDay
                payload.month = birthMonth
                payload.year = birthYear
            }

            const res = await retrievePHCode(payload)

            if (res.success && res.phcode) {
                setRetrievedPhCode(res.phcode)
                setRetrieveSource(res.source || 'legacy')
                setStep('result')
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description:
                    error.response?.data?.message || 'Failed to retrieve PH Code',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            className="from-primary/10 via-background to-accent/10 flex min-h-screen items-center justify-center bg-gradient-to-br p-4"
            style={{
                backgroundImage: 'url(/bg-cross-new.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <Card className="w-full max-w-lg shadow-lg relative">
                <button
                    onClick={() => {
                        if (step === 'method') {
                            navigate('/auth')
                        } else {
                            setStep('method')
                        }
                    }}
                    className="absolute left-3 top-3"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                <CardHeader className="text-center">
                    <div className="mb-2 flex justify-center">
                        <Logo />
                    </div>
                    <CardTitle>Retrieve PH Code</CardTitle>
                    <CardDescription>
                        Recover your PH Code using your registered details
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* STEP 1: METHOD */}
                    {step === 'method' && (
                        <div className="space-y-6">
                            <Button
                                onClick={() => {
                                    setRetrieveMethod('phone')
                                    setStep('form')
                                }}
                                className="w-full rounded-full outline outline-offset-2 outline-primary"
                            >
                                Use Phone Number
                            </Button>

                            <Button
                                onClick={() => {
                                    setRetrieveMethod('email')
                                    setStep('form')
                                }}
                                className="w-full rounded-full outline outline-offset-2 outline-primary"
                            >
                                Use Email
                            </Button>

                            <Button
                                onClick={() => {
                                    setRetrieveMethod('dob')
                                    setStep('form')
                                }}
                                className="w-full rounded-full outline outline-offset-2 outline-primary"
                            >
                                Use Date of Birth
                            </Button>
                        </div>
                    )}

                    {/* STEP 2: FORM */}
                    {step === 'form' && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label>Surname</Label>
                                <Input
                                    value={surname}
                                    placeholder='Enter your surname'
                                    onChange={(e) => setSurname(e.target.value)}
                                    required
                                />
                            </div>

                            {retrieveMethod === 'phone' && (
                                <div>
                                    <Label>Phone Number</Label>
                                    <Input
                                        value={phoneNumber}
                                        placeholder='Enter your phone number'
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            {retrieveMethod === 'email' && (
                                <div>
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={email}
                                        placeholder='Enter your email'
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            )}

                            {retrieveMethod === 'dob' && (
                                <div>
                                    <Label>Date of Birth</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input
                                            placeholder="Day"
                                            value={birthDay}
                                            onChange={(e) => setBirthDay(e.target.value)}
                                            required
                                        />
                                        <Input
                                            placeholder="Month"
                                            value={birthMonth}
                                            onChange={(e) => setBirthMonth(e.target.value)}
                                            required
                                        />
                                        <Input
                                            placeholder="Year"
                                            value={birthYear}
                                            onChange={(e) => setBirthYear(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                            )}
                            <br />
                            <Button
                                type="submit"
                                variant='default'
                                className="w-full rounded-full"
                                disabled={isSubmitting || !surname || (retrieveMethod === 'phone' && !phoneNumber) || (retrieveMethod === 'email' && !email) || (retrieveMethod === 'dob' && (!birthDay || !birthMonth || !birthYear))}
                            >
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Retrieve PH Code
                            </Button>
                        </form>
                    )}

                    {/* STEP 3: RESULT */}
                    {step === 'result' && (
                        <div className="space-y-4 text-center">
                            <div className="flex items-center justify-between border p-4 rounded-lg">
                                <code className="text-primary text-2xl md:text-4xl font-bold">
                                    {retrievedPhCode}
                                </code>

                                <Button
                                    variant="default"
                                    size="icon"
                                    onClick={() => {
                                        navigator.clipboard.writeText(retrievedPhCode)
                                        setIsCopied(true)
                                        setTimeout(() => setIsCopied(false), 2000)
                                    }}
                                >
                                    {isCopied ? <Check /> : <Copy />}
                                </Button>
                            </div>

                            {retrieveSource === 'signup' && (
                                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                    Use this PHCode to log in across all platforms.
                                </p>
                            )}
                            <br />
                            <Button
                                className="w-full rounded-full"
                                variant='default'
                                onClick={() => navigate('/auth')}
                            >
                                Go to Login
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default RetrievePHCodePage