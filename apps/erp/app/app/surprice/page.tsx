import React from 'react'

const page = () => {
  return (
    <div className='min-h-100 flex justify-center items-center'>
        <div className="w-full max-w-3xl bg-white rounded-3xl p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-6 mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Session Report</h1>
                <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Student</span>
                    <span className="text-sm font-medium text-gray-700">24BCADS135</span>
                </div>
            </div>
            <div className="text-left sm:text-right">
                <p className="text-sm font-medium text-gray-900">Computer Lab 3 <span className="text-gray-300 mx-1">|</span> PC: 168</p>
                <p className="text-sm text-gray-500 mt-1">04-May-2026</p>
            </div>
        </header>

        <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Total Lab Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">1 hr 40 min</p>
            </div>
            <div className="inline-flex items-center rounded-full bg-white border border-gray-200 px-3 py-1 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                <span className="text-sm font-medium text-gray-600">09:00 AM - 10:40 AM</span>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-5">App Usage</h2>
                <div className="space-y-5">
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700">Power BI</span>
                            <span className="text-gray-500">46 min</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-indigo-500 h-2 rounded-full" ></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700">Chrome</span>
                            <span className="text-gray-500">30 min</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-blue-400 h-2 rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700">VS Code</span>
                            <span className="text-gray-500">20 min</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-sky-500 h-2 rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium text-gray-700">File Explorer</span>
                            <span className="text-gray-500">4 min</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="bg-amber-400 h-2 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-5">Activity Split</h2>
                
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-3xl font-bold text-gray-900">60%</p>
                            <p className="text-sm font-medium text-green-600 mt-1">Active (60 min)</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-semibold text-gray-400">40%</p>
                            <p className="text-sm font-medium text-gray-500 mt-1">Idle (40 min)</p>
                        </div>
                    </div>
                    
                    <div className="w-full flex h-3 rounded-full overflow-hidden bg-gray-100">
                        <div className="bg-green-500 h-full transition-all duration-500"></div>
                        <div className="bg-gray-200 h-full transition-all duration-500"></div>
                    </div>
                </div>
            </section>
        </div>

        <section>
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-semibold text-gray-900">Search History</h2>
                <span className="bg-gray-100 text-gray-600 py-1 px-3 rounded-full text-xs font-medium">12 total</span>
            </div>
            
            <div className="space-y-3">
                <div className="flex gap-4 items-start p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                    <span className="text-xs font-semibold text-gray-400 w-12 pt-1">09:12</span>
                    <div>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Google</p>
                        <p className="text-sm text-gray-800">"DAX calculate function examples"</p>
                    </div>
                </div>
                
                <div className="flex gap-4 items-start p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                    <span className="text-xs font-semibold text-gray-400 w-12 pt-1">09:18</span>
                    <div>
                        <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">YouTube</p>
                        <p className="text-sm text-gray-800">"power bi dashboard tutorial"</p>
                    </div>
                </div>

                <div className="flex gap-4 items-start p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                    <span className="text-xs font-semibold text-gray-400 w-12 pt-1">09:25</span>
                    <div>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Google</p>
                        <p className="text-sm text-gray-800">"stack overflow power bi date filter"</p>
                    </div>
                </div>

                <div className="flex gap-4 items-start p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group">
                    <span className="text-xs font-semibold text-gray-400 w-12 pt-1">09:40</span>
                    <div>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Microsoft Learn</p>
                        <p className="text-sm text-gray-800">"power bi relationship"</p>
                    </div>
                </div>

                <div className="pl-16 pt-2">
                    <p className="text-sm text-gray-400 font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                        <span className="ml-2">8 more entries</span>
                    </p>
                </div>
            </div>
        </section>

    </div>
    </div>
  )
}

export default page